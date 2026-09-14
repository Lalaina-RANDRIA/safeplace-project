import type {
  Evidence,
  EvidenceSourceType,
  SourceReliability,
  EvidenceStance,
} from "../types/evidence";

/**
 * Configuration du service Fact Check.
 *
 * Les valeurs sensibles doivent être placées
 * dans les variables d'environnement.
 */
interface FactCheckConfig {
  apiKey: string;
  apiUrl: string;
}

/**
 * Structure minimale d'une revue de fact-checking
 * renvoyée par l'API.
 *
 * On définit uniquement les propriétés dont
 * SafePlace a besoin.
 */
interface FactCheckApiReview {
  publisher?: {
    name?: string;
    site?: string;
  };

  url?: string;

  title?: string;

  textualRating?: string;

  languageCode?: string;

  reviewDate?: string;
}

/**
 * Structure minimale d'une affirmation
 * renvoyée par l'API.
 */
interface FactCheckApiClaim {
  text?: string;

  claimant?: string;

  claimReview?: FactCheckApiReview[];
}

/**
 * Réponse de recherche de l'API Fact Check.
 */
interface FactCheckApiResponse {
  claims?: FactCheckApiClaim[];
}

/**
 * Résultat interne utilisé pendant la conversion
 * des résultats externes vers Evidence.
 */
interface FactCheckMatch {
  claimText: string;
  review: FactCheckApiReview;
}

/**
 * Service responsable de la recherche
 * de fact-checks existants.
 */
export class FactCheckService {
  private config: FactCheckConfig;

  constructor() {
    /*
     * Récupération des paramètres depuis .env.
     */
    const apiKey = process.env.FACTCHECK_API_KEY || "";

    const apiUrl =
      process.env.FACTCHECK_API_URL ||
      "https://factchecktools.googleapis.com/v1alpha1/claims:search";

    this.config = {
      apiKey: apiKey,
      apiUrl: apiUrl,
    };
  }

  /**
   * Recherche les fact-checks correspondant
   * à une affirmation.
   *
   * @param claimText Texte de l'affirmation.
   * @returns Liste de preuves provenant
   *          de fact-checks existants.
   */
  async searchFactChecks(claimText: string): Promise<Evidence[]> {
    /*
     * Vérification de l'entrée.
     */
    if (!claimText || claimText.trim().length === 0) {
      return [];
    }

    /*
     * Vérification de la clé API.
     *
     * En développement, on préfère retourner
     * une liste vide plutôt que de faire planter
     * toute l'analyse.
     */
    if (!this.config.apiKey) {
      console.warn("FACTCHECK_API_KEY n'est pas configurée.");

      return [];
    }

    try {
      /*
       * Construction des paramètres de requête.
       */
      const parameters = new URLSearchParams();

      parameters.set("query", claimText);

      parameters.set("key", this.config.apiKey);

      /*
       * Construction de l'URL finale.
       */
      const requestUrl = this.config.apiUrl + "?" + parameters.toString();

      /*
       * Appel HTTP vers l'API.
       *
       * Node.js récent fournit fetch nativement.
       */
      const response = await fetch(requestUrl);

      /*
       * Gestion des erreurs HTTP.
       */
      if (!response.ok) {
        console.error(
          "Erreur Fact Check API:",
          response.status,
          response.statusText,
        );

        return [];
      }

      /*
       * Conversion de la réponse en JSON.
       */
      const data = (await response.json()) as FactCheckApiResponse;

      /*
       * Conversion des résultats externes
       * vers notre format Evidence.
       */
      return this.convertToEvidence(data, claimText);
    } catch (error) {
      /*
       * Une erreur de fact-checking ne doit pas
       * empêcher l'ensemble de SafePlace
       * de produire un résultat.
       */
      console.error("Erreur lors de la recherche des fact-checks:", error);

      return [];
    }
  }

  /**
   * Convertit la réponse de l'API externe
   * vers le modèle Evidence utilisé par SafePlace.
   */
  private convertToEvidence(
    data: FactCheckApiResponse,
    searchedClaim: string,
  ): Evidence[] {
    const evidence: Evidence[] = [];

    /*
     * Vérification de la présence de résultats.
     */
    if (!data.claims || data.claims.length === 0) {
      return evidence;
    }

    /*
     * Parcours des affirmations retournées.
     */
    for (const claim of data.claims) {
      /*
       * Une API peut retourner une affirmation
       * sans revue associée.
       */
      if (!claim.claimReview || claim.claimReview.length === 0) {
        continue;
      }

      /*
       * Parcours des différentes revues
       * pouvant être associées à l'affirmation.
       */
      for (const review of claim.claimReview) {
        /*
         * Une URL est nécessaire pour afficher
         * la source à l'utilisateur.
         */
        if (!review.url) {
          continue;
        }

        /*
         * Détermination du nom de la source.
         */
        const sourceName = review.publisher?.name || "Source de fact-checking";

        /*
         * Conversion de l'évaluation textuelle
         * en position par rapport à l'affirmation.
         */
        const stance = this.determineStance(review.textualRating);

        /*
         * Estimation de la fiabilité de la source.
         *
         * Important :
         * ce n'est qu'une classification interne.
         * Elle ne signifie pas que toute source
         * de fact-checking est automatiquement exacte.
         */
        const reliability = this.determineReliability(sourceName);

        /*
         * Construction de la preuve.
         */
        const item: Evidence = {
          id: this.generateEvidenceId(),

          title: review.title || "Fact-check disponible",

          url: review.url,

          sourceName: sourceName,

          sourceType: "FACT_CHECK" as EvidenceSourceType,

          reliability: reliability,

          publishedAt: review.reviewDate,

          retrievedAt: new Date().toISOString(),

          excerpt: this.buildExcerpt(
            claim.text,
            searchedClaim,
            review.textualRating,
          ),

          stance: stance,

          relevanceScore: this.calculateRelevance(claim.text, searchedClaim),

          confidenceScore: this.calculateConfidence(
            stance,
            review.textualRating,
          ),
        };

        evidence.push(item);
      }
    }

    return evidence;
  }

  /**
   * Transforme une évaluation textuelle
   * en position SUPPORTS / REFUTES / NEUTRAL.
   */
  private determineStance(textualRating?: string): EvidenceStance {
    /*
     * Lorsqu'aucune évaluation n'est disponible,
     * on ne doit pas inventer un verdict.
     */
    if (!textualRating || textualRating.trim().length === 0) {
      return "NEUTRAL";
    }

    const rating = textualRating.toLowerCase();

    /*
     * Expressions indiquant généralement
     * que l'affirmation est fausse.
     */
    const refutingTerms: string[] = [
      "false",
      "faux",
      "fausse",
      "faux.",
      "incorrect",
      "incorrecte",
      "inexact",
      "inexacte",
      "misleading",
      "trompeur",
      "trompeuse",
      "pants on fire",
      "fake",
    ];

    for (const term of refutingTerms) {
      if (rating.includes(term)) {
        return "REFUTES";
      }
    }

    /*
     * Expressions indiquant généralement
     * que l'affirmation est correcte.
     */
    const supportingTerms: string[] = [
      "true",
      "vrai",
      "correct",
      "correcte",
      "exact",
      "exacte",
      "accurate",
      "confirmed",
      "confirmé",
      "confirme",
    ];

    for (const term of supportingTerms) {
      if (rating.includes(term)) {
        return "SUPPORTS";
      }
    }

    /*
     * Dans les cas intermédiaires :
     *
     * "partiellement vrai"
     * "manque de contexte"
     * "trompeur"
     *
     * on ne force pas un verdict binaire.
     */
    return "NEUTRAL";
  }

  /**
   * Estime la fiabilité d'un éditeur
   * de fact-checking.
   *
   * Pour l'instant, on utilise une valeur prudente.
   *
   * Une future version pourra utiliser :
   * - une liste de sources reconnues ;
   * - le domaine ;
   * - des métadonnées ;
   * - une note calculée dynamiquement.
   */
  private determineReliability(sourceName: string): SourceReliability {
    if (!sourceName || sourceName.trim().length === 0) {
      return "UNKNOWN";
    }

    /*
     * On évite ici de déclarer arbitrairement
     * certaines organisations comme "très fiables".
     *
     * Pour la première version :
     * fact-checker identifié = HIGH.
     */
    return "HIGH";
  }

  /**
   * Calcule un score de pertinence approximatif.
   *
   * Cette première version utilise une comparaison
   * simple entre les mots de l'affirmation recherchée
   * et ceux retournés par le fact-check.
   */
  private calculateRelevance(
    originalClaim: string | undefined,
    searchedClaim: string,
  ): number {
    if (!originalClaim || originalClaim.trim().length === 0) {
      return 0;
    }

    /*
     * Normalisation des deux textes.
     */
    const originalWords = this.extractWords(originalClaim);

    const searchedWords = this.extractWords(searchedClaim);

    if (originalWords.length === 0 || searchedWords.length === 0) {
      return 0;
    }

    let matchingWords = 0;

    /*
     * Comptage des mots communs.
     */
    for (const word of searchedWords) {
      if (originalWords.includes(word)) {
        matchingWords++;
      }
    }

    const score = matchingWords / searchedWords.length;

    /*
     * Limitation entre 0 et 1.
     */
    if (score < 0) {
      return 0;
    }

    if (score > 1) {
      return 1;
    }

    return score;
  }

  /**
   * Calcule le niveau de confiance
   * associé à une évaluation.
   */
  private calculateConfidence(
    stance: EvidenceStance,
    textualRating?: string,
  ): number {
    /*
     * Sans évaluation explicite :
     * confiance faible.
     */
    if (!textualRating || textualRating.trim().length === 0) {
      return 0.3;
    }

    /*
     * Une évaluation explicitement interprétable
     * fournit davantage d'information.
     */
    if (stance === "SUPPORTS" || stance === "REFUTES") {
      return 0.8;
    }

    /*
     * Evaluation existante mais ambiguë.
     */
    return 0.5;
  }

  /**
   * Génère un extrait lisible de la preuve.
   */
  private buildExcerpt(
    claimText: string | undefined,
    searchedClaim: string,
    textualRating?: string,
  ): string {
    const claim = claimText || searchedClaim;

    if (textualRating && textualRating.trim().length > 0) {
      return (
        "Évaluation du fact-check : " +
        textualRating +
        ". Affirmation vérifiée : " +
        claim
      );
    }

    return "Fact-check trouvé pour l'affirmation : " + claim;
  }

  /**
   * Extrait les mots significatifs
   * d'un texte.
   */
  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 3);
  }

  /**
   * Génère un identifiant unique
   * pour une preuve.
   */
  private generateEvidenceId(): string {
    return (
      "evidence-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).substring(2, 8)
    );
  }
}

/**
 * Instance utilisée par analysis.service.ts.
 */
export const factcheckService = new FactCheckService();
