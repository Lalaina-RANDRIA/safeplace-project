import type {
  Evidence,
  EvidenceSourceType,
  SourceReliability,
} from "../types/evidence";

/**
 * Configuration du moteur de recherche.
 */
interface SearchConfig {
  apiKey: string;
  apiUrl: string;
  clientId: string;
  languageCode: string;
  regionCode: string;
  defaultResults: number;
}

/**
 * Structure d'un résultat retourné par le
 * moteur de recherche.
 *
 * Cette interface représente uniquement les champs
 * dont SafePlace a besoin.
 */
interface SearchApiResult {
  title?: string;
  displayUrl?: string;
  snippet?: string;
}

/**
 * Structure de la réponse de l'API.
 */
interface SearchApiResponse {
  searchResults?: SearchApiResult[];

  searchInfo?: {
    correctedQuery?: string;
    searchDuration?: string;
    totalResults?: string;
  };
}
/**
 * Paramètres supplémentaires pour une recherche.
 */
export interface SearchOptions {
  /**
   * Nombre maximal de résultats.
   */
  maxResults?: number;

  /**
   * Langue de recherche.
   *
   * Exemple :
   * "fr"
   * "en"
   */
  languageCode?: string;

  /**
   * Code région.
   *
   * Exemple :
   * "MG"
   * "FR"
   */
  regionCode?: string;

  /**
   * Liste de domaines à privilégier.
   *
   * Exemple :
   * ["gov.mg", "who.int"]
   */
  preferredDomains?: string[];

  /**
   * Liste de domaines à exclure.
   */
  excludedDomains?: string[];
}

/**
 * Service responsable de la recherche des preuves
 * sur Internet.
 */
export class SearchService {
  private config: SearchConfig;

  constructor() {
    /*
     * Lecture des variables d'environnement.
     */
    this.config = {
      apiKey: process.env.SEARCH_API_KEY || "",

      apiUrl:
        process.env.SEARCH_API_URL ||
        "https://websearchservice.googleapis.com/v1:search",

      clientId: process.env.SEARCH_CLIENT_ID || "",

      languageCode: process.env.SEARCH_LANGUAGE || "fr",

      regionCode: process.env.SEARCH_REGION || "MG",

      defaultResults: this.getDefaultResults(),
    };
  }

  /**
   * Recherche des sources pouvant servir de preuves
   * pour une affirmation.
   */
  async searchEvidence(
    claimText: string,
    options?: SearchOptions,
  ): Promise<Evidence[]> {
    /*
     * Vérification du texte.
     */
    if (!claimText || claimText.trim().length === 0) {
      return [];
    }

    /*
     * Vérification de la configuration.
     *
     * Sans clé API ou client ID, le service
     * ne peut pas effectuer la recherche.
     */
    if (!this.config.apiKey || !this.config.clientId) {
      console.warn("SEARCH_API_KEY ou SEARCH_CLIENT_ID n'est pas configuré.");

      return [];
    }

    try {
      /*
       * Construction de la requête de recherche.
       */
      const searchQuery = this.buildSearchQuery(claimText, options);

      /*
       * Construction de l'URL.
       */
      const url = this.buildRequestUrl(searchQuery, options);

      /*
       * Appel de l'API avec timeout.
       */
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "X-Goog-Api-Key": this.config.apiKey,
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      /*
       * Vérification de la réponse HTTP.
       */
      if (!response.ok) {
        console.error(
          "Erreur du moteur de recherche :",
          response.status,
          response.statusText,
        );

        return [];
      }

      /*
       * Conversion en JSON.
       */
      const data = (await response.json()) as SearchApiResponse;

      /*
       * Conversion des résultats externes
       * vers notre modèle Evidence.
       */
      return this.convertResultsToEvidence(data, claimText);
    } catch (error) {
      /*
       * Une erreur du moteur de recherche
       * ne doit pas faire planter toute l'analyse.
       */
      if (error instanceof DOMException && error.name === "AbortError") {
        console.warn("Timeout lors de la recherche Web (10s)");
      } else {
        console.error("Erreur lors de la recherche Web :", error);
      }

      return [];
    }
  }

  /**
   * Construit la requête envoyée au moteur.
   */
  private buildSearchQuery(claimText: string, options?: SearchOptions): string {
    /*
     * Nettoyage de l'affirmation.
     */
    let query = claimText.trim();

    /*
     * Ajout de domaines prioritaires.
     *
     * Exemple :
     *
     * site:gov.mg
     * site:who.int
     */
    if (options?.preferredDomains && options.preferredDomains.length > 0) {
      const domainQueries: string[] = [];

      for (const domain of options.preferredDomains) {
        const cleanedDomain = this.cleanDomain(domain);

        if (cleanedDomain.length === 0) {
          continue;
        }

        domainQueries.push("site:" + cleanedDomain);
      }

      if (domainQueries.length > 0) {
        query = query + " " + domainQueries.join(" OR ");
      }
    }

    /*
     * Exclusion de domaines.
     */
    if (options?.excludedDomains && options.excludedDomains.length > 0) {
      for (const domain of options.excludedDomains) {
        const cleanedDomain = this.cleanDomain(domain);

        if (cleanedDomain.length === 0) {
          continue;
        }

        query = query + " -site:" + cleanedDomain;
      }
    }

    return query;
  }

  /**
   * Construit l'URL complète de recherche.
   */
  private buildRequestUrl(
    searchQuery: string,
    options?: SearchOptions,
  ): string {
    const parameters = new URLSearchParams();

    /*
     * Requête principale.
     */
    parameters.set("searchQuery.query", searchQuery);

    /*
     * Client SafePlace.
     */
    parameters.set("clientContext.clientId", this.config.clientId);

    /*
     * Langue.
     */
    parameters.set(
      "searchQuery.languageCode",
      options?.languageCode || this.config.languageCode,
    );

    /*
     * Région.
     */
    parameters.set(
      "searchQuery.restrictRegionCode",
      options?.regionCode || this.config.regionCode,
    );

    /*
     * Nombre de résultats.
     *
     * L'API documente actuellement une valeur
     * de pageSize comprise entre 1 et 20.
     */
    const requestedResults = options?.maxResults || this.config.defaultResults;

    const pageSize = this.limitResults(requestedResults);

    parameters.set("pageSize", pageSize.toString());

    /*
     * SafeSearch.
     */
    parameters.set("searchQuery.safeSearch", "ON");

    return this.config.apiUrl + "?" + parameters.toString();
  }

  /**
   * Convertit les résultats de l'API
   * en objets Evidence utilisés par SafePlace.
   */
  private convertResultsToEvidence(
    data: SearchApiResponse,
    claimText: string,
  ): Evidence[] {
    const evidence: Evidence[] = [];

    /*
     * Aucun résultat.
     */
    if (!data.searchResults || data.searchResults.length === 0) {
      return evidence;
    }

    /*
     * Parcours des résultats.
     */
    for (const result of data.searchResults) {
      /*
       * Une URL est nécessaire.
       */
      if (!result.displayUrl) {
        continue;
      }

      /*
       * Nettoyage de l'URL.
       */
      const url = this.normalizeUrl(result.displayUrl);

      if (!url) {
        continue;
      }

      /*
       * Identification de la source.
       */
      const sourceName = this.extractDomainName(url);

      /*
       * Classification de la source.
       */
      const sourceType = this.detectSourceType(url);

      /*
       * Fiabilité initiale.
       *
       * Il ne s'agit PAS d'un verdict de vérité.
       * C'est uniquement un niveau initial utilisé
       * par le système.
       */
      const reliability = this.determineReliability(url);

      /*
       * Calcul de la pertinence du résultat
       * par rapport à l'affirmation.
       */
      const relevanceScore = this.calculateRelevance(
        claimText,
        (result.title || "") + " " + (result.snippet || ""),
      );

      /*
       * Création de la preuve.
       */
      const item: Evidence = {
        id: this.generateEvidenceId(url),

        title: result.title || "Résultat de recherche",

        url: url,

        sourceName: sourceName,

        sourceType: sourceType,

        reliability: reliability,

        retrievedAt: new Date().toISOString(),

        excerpt: result.snippet || "",

        stance: "NEUTRAL",

        relevanceScore: relevanceScore,

        confidenceScore: relevanceScore,
      };

      evidence.push(item);
    }

    /*
     * Classement :
     * les résultats les plus pertinents d'abord.
     */
    evidence.sort(
      (premierePreuve, deuxiemePreuve) =>
        deuxiemePreuve.relevanceScore - premierePreuve.relevanceScore,
    );

    /*
     * Déduplication par domaine : on garde seulement le résultat le plus pertinent par domaine
     */
    const uniqueByDomain = this.deduplicateByDomain(evidence);

    return uniqueByDomain;
  }

  /**
   * Déduplique les preuves par domaine (garde le plus pertinent par domaine)
   */
  private deduplicateByDomain(evidence: Evidence[]): Evidence[] {
    const seenDomains = new Set<string>();
    return evidence.filter(item => {
      try {
        const domain = new URL(item.url).hostname;
        if (seenDomains.has(domain)) {
          return false;
        }
        seenDomains.add(domain);
        return true;
      } catch {
        return true; // Garde si URL invalide
      }
    });
  }

  /**
   * Détermine le type d'une source à partir de son URL.
   */
  private detectSourceType(url: string): EvidenceSourceType {
    const lowerUrl = url.toLowerCase();

    /*
     * Sources gouvernementales.
     */
    if (lowerUrl.includes(".gov.") || lowerUrl.includes(".gouv.")) {
      return "OFFICIAL";
    }

    /*
     * Sites scientifiques / universitaires.
     */
    if (lowerUrl.includes(".edu.") || lowerUrl.includes(".ac.")) {
      return "SCIENTIFIC";
    }

    /*
     * Sites de référence.
     */
    const referenceDomains: string[] = ["wikipedia.org", "britannica.com"];

    for (const domain of referenceDomains) {
      if (lowerUrl.includes(domain)) {
        return "REFERENCE";
      }
    }

    /*
     * Par défaut, une page Web trouvée
     * est classée comme autre source.
     */
    return "OTHER";
  }

  /**
   * Estime un niveau initial de fiabilité
   * à partir du domaine.
   */
  private determineReliability(url: string): SourceReliability {
    const lowerUrl = url.toLowerCase();

    /*
     * Sources institutionnelles.
     */
    if (lowerUrl.includes(".gov.") || lowerUrl.includes(".gouv.")) {
      return "VERY_HIGH";
    }

    /*
     * Universités / institutions académiques.
     */
    if (lowerUrl.includes(".edu.") || lowerUrl.includes(".ac.")) {
      return "HIGH";
    }

    /*
     * Pour les autres sources,
     * on reste prudent.
     */
    return "MEDIUM";
  }

  /**
   * Calcule une pertinence simplifiée
   * entre l'affirmation et le résultat.
   */
  private calculateRelevance(claimText: string, resultText: string): number {
    const claimWords = this.extractWords(claimText);

    const resultWords = this.extractWords(resultText);

    if (claimWords.length === 0 || resultWords.length === 0) {
      return 0;
    }

    let matchingWords = 0;

    /*
     * Recherche des mots communs.
     */
    for (const claimWord of claimWords) {
      if (resultWords.includes(claimWord)) {
        matchingWords++;
      }
    }

    /*
     * Calcul du ratio.
     */
    const score = matchingWords / claimWords.length;

    return this.clamp(score, 0, 1);
  }

  /**
   * Extrait les mots d'un texte.
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
   * Extrait le nom de domaine.
   */
  private extractDomainName(url: string): string {
    try {
      const parsedUrl = new URL(url);

      return parsedUrl.hostname;
    } catch {
      return "Source inconnue";
    }
  }

  /**
   * Nettoie un domaine.
   */
  private cleanDomain(domain: string): string {
    return domain
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  }

  /**
   * Normalise une URL.
   */
  private normalizeUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);

      /*
       * SafePlace ne traite que HTTP et HTTPS.
       */
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return null;
      }

      return parsedUrl.toString();
    } catch {
      return null;
    }
  }

  /**
   * Limite le nombre de résultats.
   *
   * L'API actuelle accepte 1 à 20 résultats.
   */
  private limitResults(requestedResults: number): number {
    if (requestedResults < 1) {
      return 1;
    }

    if (requestedResults > 20) {
      return 20;
    }

    return Math.floor(requestedResults);
  }

  /**
   * Retourne le nombre de résultats par défaut.
   */
  private getDefaultResults(): number {
    const value = Number(process.env.SEARCH_DEFAULT_RESULTS || "10");

    return this.limitResults(value);
  }

  /**
   * Limite une valeur entre 0 et 1.
   */
  private clamp(value: number, minimum: number, maximum: number): number {
    if (value < minimum) {
      return minimum;
    }

    if (value > maximum) {
      return maximum;
    }

    return value;
  }

  /**
   * Génère un identifiant unique.
   */
  private generateEvidenceId(url: string): string {
    return "search-evidence-" + this.hashText(url);
  }

  private hashText(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Instance utilisée par analysis.service.ts.
 */
export const searchService = new SearchService();
