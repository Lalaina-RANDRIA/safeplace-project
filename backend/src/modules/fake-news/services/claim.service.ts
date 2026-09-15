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
       * Filtrer les contenus non factuels (questions, opinions, instructions, etc.)
       */
      if (this.isNonFactual(sentence)) {
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
        id: this.generateClaimId(sentence),

        text: sentence,

        importance: importance,

        checkable: true,

        language: this.detectLanguage(sentence),

        confidence: 0.75,
      };

      claims.push(claim);
    }

    /*
     * Déduplication des claims (même texte = même claim)
     */
    const uniqueClaims = this.deduplicateClaims(claims);

    /*
     * Tri des affirmations :
     * les plus importantes apparaissent en premier.
     */
    uniqueClaims.sort(
      (premiereAffirmation, deuxiemeAffirmation) =>
        deuxiemeAffirmation.importance - premiereAffirmation.importance,
    );

    return uniqueClaims;
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
   * Génère un identifiant unique et déterministe
   * pour une affirmation basé sur son contenu.
   */
  private generateClaimId(text: string): string {
    // Hash simple et déterministe basé sur le contenu
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return "claim-" + Math.abs(hash).toString(36);
  }

  /**
   * Détecte si une phrase est du contenu non factuel
   * (questions, opinions, instructions, titres, émotionnel, etc.)
   */
  private isNonFactual(sentence: string): boolean {
    const trimmed = sentence.trim().toLowerCase();

    // Questions
    if (trimmed.endsWith("?") || /^(?:est-ce que|qu'est-ce que|qui|quoi|où|quand|comment|pourquoi|êtes-vous|êtes vous|pensez-vous|croyez-vous)/i.test(sentence)) {
      return true;
    }

    // Opinions subjectives
    if (/^(?:je pense|je crois|à mon avis|selon moi|i think|i believe|in my opinion|à mon sens|personnellement)/i.test(sentence)) {
      return true;
    }

    // Instructions / Appels à l'action
    if (/^(?:partagez|cliquez|abonnez-vous|inscrivez-vous|achetez|acheter|téléchargez|suivez|likez|commentez|regardez|écoutez|lisez|découvrez|visitez|contactez|appelez|envoyez)\b/i.test(sentence)) {
      return true;
    }

    // Titres seuls (très courts, sans verbe principal)
    if (sentence.split(/\s+/).length < 5 && !/[.!?]$/.test(sentence.trim())) {
      return true;
    }

    // Phrases purement émotionnelles / exclamations
    if (/^(?:incroyable|wow|génial|super|formidable|terrible|horrible|choquant|scandaleux|extraordinaire|fantastique|magnifique|merveilleux|affreux|épouvantable)\b/i.test(sentence) || /\b(?:est|semble|is|seems)\s+(?:incroyable|génial|super|formidable|terrible|horrible|choquant|scandaleux|extraordinaire|fantastique|magnifique|merveilleux|affreux|épouvantable)\b/i.test(sentence)) {
      return true;
    }

    // Commentaires génériques / métadonnées
    if (/^(?:lire la suite|voir plus|suite de l'article|publié le|mis à jour|source :|via |partager|tweet|retweet|like|commentaire)/i.test(sentence)) {
      return true;
    }

    // Citations sans affirmation propre
    if (/^["«].*["»]$/.test(sentence.trim()) && sentence.split(/\s+/).length < 15) {
      return true;
    }

    return false;
  }

  /**
   * Déduplique les claims basés sur leur texte normalisé
   */
  private deduplicateClaims(claims: Claim[]): Claim[] {
    const seen = new Set<string>();
    return claims.filter(claim => {
      const normalized = claim.text.toLowerCase().trim();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }

  private detectLanguage(text: string): "fr" | "mg" | "en" | "unknown" {
    const normalized = text.toLowerCase();
    if (/\b(the|is|are|was|were|according|study|people)\b/.test(normalized)) return "en";
    if (/\b(ary|amin|izay|dia|ny|ho|amin'ny)\b/.test(normalized)) return "mg";
    if (/\b(le|la|les|est|sont|selon|étude|personnes)\b/.test(normalized)) return "fr";
    return "unknown";
  }
}

/**
 * Instance du service utilisée
 * par analysis.service.ts.
 */
export const claimService = new ClaimService();
