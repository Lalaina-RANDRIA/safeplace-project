import type { Claim } from "../types/analysis";

/**
 * Service responsable de l'identification
 * des affirmations vérifiables dans un texte.
 */
export class ClaimService {
  /**
   * Extrait les affirmations principales d'un texte.
   *
   * Cette première version utilise une approche
   * basée sur des règles simples.
   *
   * Une version ultérieure pourra utiliser une IA
   * pour améliorer la détection.
   */
  async extractClaims(content: string): Promise<Claim[]> {
    /*
     * Vérification du contenu reçu.
     */
    if (!content || content.trim().length === 0) {
      return [];
    }

    /*
     * Nettoyage du texte.
     *
     * On remplace plusieurs espaces ou retours à la ligne
     * par un seul espace.
     */
    const cleanedContent = this.cleanText(content);

    /*
     * Découpage du texte en phrases.
     */
    const sentences = this.splitIntoSentences(cleanedContent);

    /*
     * Liste finale des affirmations.
     */
    const claims: Claim[] = [];

    /*
     * Analyse de chaque phrase.
     */
    for (const sentence of sentences) {
      /*
       * On ignore les phrases trop courtes.
       */
      if (sentence.length < 20) {
        continue;
      }

      /*
       * Détermination du caractère vérifiable
       * de la phrase.
       */
      const checkable = this.isCheckable(sentence);

      /*
       * Pour cette première version,
       * on ne conserve que les phrases
       * pouvant potentiellement être vérifiées.
       */
      if (!checkable) {
        continue;
      }

      /*
       * Calcul d'un score d'importance.
       */
      const importance = this.calculateImportance(sentence);

      /*
       * Création de l'affirmation.
       */
      const claim: Claim = {
        id: this.generateClaimId(),

        text: sentence,

        importance: importance,

        checkable: true,
      };

      claims.push(claim);
    }

    /*
     * Tri des affirmations :
     * les plus importantes apparaissent en premier.
     */
    claims.sort(
      (premiereAffirmation, deuxiemeAffirmation) =>
        deuxiemeAffirmation.importance - premiereAffirmation.importance,
    );

    return claims;
  }

  /**
   * Nettoie le texte avant son analyse.
   */
  private cleanText(content: string): string {
    return content.replace(/\s+/g, " ").trim();
  }

  /**
   * Sépare le texte en phrases.
   *
   * Cette méthode reste volontairement simple
   * pour la première version.
   */
  private splitIntoSentences(content: string): string[] {
    const sentences = content.split(/(?<=[.!?])\s+/);

    return sentences
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);
  }

  /**
   * Détermine si une phrase ressemble
   * à une affirmation vérifiable.
   */
  private isCheckable(sentence: string): boolean {
    /*
     * Expressions généralement présentes
     * dans des affirmations factuelles.
     */
    const indicators: string[] = [
      "est",
      "sont",
      "a",
      "ont",
      "sera",
      "seront",
      "était",
      "étaient",
      "selon",
      "annonce",
      "annoncé",
      "affirme",
      "affirmé",
      "déclare",
      "déclaré",
      "confirme",
      "confirmé",
      "cause",
      "provoque",
      "provoqué",
      "augmente",
      "augmenté",
      "diminue",
      "diminué",
      "millions",
      "milliards",
      "%",
      "km",
      "kg",
      "personnes",
      "habitants",
      "officiel",
      "officiellement",
    ];

    const sentenceLowerCase = sentence.toLowerCase();

    /*
     * On vérifie si au moins un indicateur
     * apparaît dans la phrase.
     */
    for (const indicator of indicators) {
      if (sentenceLowerCase.includes(indicator)) {
        return true;
      }
    }

    /*
     * Présence d'un nombre :
     * "Madagascar compte 30 millions..."
     */
    const contientUnNombre = /\d+/.test(sentence);

    if (contientUnNombre) {
      return true;
    }

    return false;
  }

  /**
   * Calcule un score d'importance
   * compris entre 0 et 1.
   */
  private calculateImportance(sentence: string): number {
    let score = 0.5;

    /*
     * Les phrases contenant des nombres
     * sont souvent des affirmations importantes.
     */
    if (/\d+/.test(sentence)) {
      score += 0.15;
    }

    /*
     * Les pourcentages sont particulièrement
     * intéressants pour le fact-checking.
     */
    if (sentence.includes("%")) {
      score += 0.15;
    }

    /*
     * Certaines expressions augmentent
     * la probabilité qu'il s'agisse
     * d'une affirmation importante.
     */
    const importantWords: string[] = [
      "gouvernement",
      "président",
      "ministère",
      "officiel",
      "scientifique",
      "étude",
      "rapport",
      "statistique",
      "élection",
      "économie",
      "santé",
    ];

    const sentenceLowerCase = sentence.toLowerCase();

    for (const word of importantWords) {
      if (sentenceLowerCase.includes(word)) {
        score += 0.05;
      }
    }

    /*
     * Limitation du score à 1.
     */
    if (score > 1) {
      score = 1;
    }

    return score;
  }

  /**
   * Génère un identifiant unique
   * pour une affirmation.
   */
  private generateClaimId(): string {
    return (
      "claim-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).substring(2, 8)
    );
  }
}

/**
 * Instance du service utilisée
 * par analysis.service.ts.
 */
export const claimService = new ClaimService();
