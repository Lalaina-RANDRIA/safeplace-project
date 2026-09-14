import type { ClaimAnalysis, Verdict } from "../types/analysis";

/**
 * Résultat du calcul du score global.
 */
export interface ScoringResult {
  /**
   * Score global compris entre 0 et 1.
   *
   * 1.00 = très fortement soutenu
   * 0.00 = très fortement réfuté
   */
  score: number;

  /**
   * Verdict global de la page.
   */
  verdict: Verdict;

  /**
   * Nombre d'affirmations soutenues.
   */
  supportedClaims: number;

  /**
   * Nombre d'affirmations réfutées.
   */
  refutedClaims: number;

  /**
   * Nombre d'affirmations sans suffisamment de preuves.
   */
  notEnoughInfoClaims: number;

  /**
   * Nombre d'affirmations incertaines.
   */
  uncertainClaims: number;
}

/**
 * Service responsable du calcul du score global.
 */
export class ScoringService {
  /**
   * Calcule le score et le verdict global
   * à partir des analyses individuelles.
   */
  calculateOverallScore(claimAnalyses: ClaimAnalysis[]): ScoringResult {
    /*
     * Aucun claim détecté.
     *
     * On ne peut pas dire que la page est vraie
     * ni qu'elle est fausse.
     */
    if (!claimAnalyses || claimAnalyses.length === 0) {
      return {
        score: 0.5,
        verdict: "NOT_ENOUGH_INFO",
        supportedClaims: 0,
        refutedClaims: 0,
        notEnoughInfoClaims: 0,
        uncertainClaims: 0,
      };
    }

    /*
     * Compteurs des différents verdicts.
     */
    let supportedClaims = 0;
    let refutedClaims = 0;
    let notEnoughInfoClaims = 0;
    let uncertainClaims = 0;

    /*
     * Somme pondérée.
     */
    let weightedScore = 0;

    /*
     * Somme des poids utilisés.
     */
    let totalWeight = 0;

    /*
     * Analyse de chaque affirmation.
     */
    for (const analysis of claimAnalyses) {
      /*
       * Comptage du verdict.
       */
      switch (analysis.verdict) {
        case "SUPPORTED":
          supportedClaims++;
          break;

        case "REFUTED":
          refutedClaims++;
          break;

        case "NOT_ENOUGH_INFO":
          notEnoughInfoClaims++;
          break;

        case "UNCERTAIN":
          uncertainClaims++;
          break;
      }

      /*
       * Calcul du poids de l'affirmation.
       *
       * L'importance indique combien l'affirmation
       * est importante dans l'article.
       *
       * La confiance indique à quel point le système
       * est sûr de son verdict.
       */
      let importance = analysis.claim.importance;

      let confidence = analysis.confidence;

      /*
       * Sécurisation des valeurs.
       *
       * On s'assure qu'elles restent entre 0 et 1.
       */
      importance = this.clamp(importance, 0, 1);

      confidence = this.clamp(confidence, 0, 1);

      /*
       * Une petite importance minimale est conservée
       * pour éviter qu'une affirmation de faible importance
       * soit totalement ignorée.
       */
      const weight = Math.max(importance, 0.2) * Math.max(confidence, 0.2);

      /*
       * Transformation du verdict en score numérique.
       *
       * SUPPORTED       -> 1
       * REFUTED        -> 0
       * NOT_ENOUGH_INFO -> 0.5
       * UNCERTAIN        -> 0.5
       */
      const verdictScore = this.getVerdictScore(analysis.verdict);

      /*
       * Ajout à la somme pondérée.
       */
      weightedScore += verdictScore * weight;

      /*
       * Ajout du poids total.
       */
      totalWeight += weight;
    }

    /*
     * Calcul du score final.
     */
    let overallScore = 0.5;

    if (totalWeight > 0) {
      overallScore = weightedScore / totalWeight;
    }

    /*
     * Sécurisation du résultat.
     */
    overallScore = this.clamp(overallScore, 0, 1);

    /*
     * Détermination du verdict global.
     */
    const overallVerdict = this.determineOverallVerdict(
      overallScore,
      supportedClaims,
      refutedClaims,
      notEnoughInfoClaims,
      uncertainClaims,
      claimAnalyses.length,
    );

    return {
      score: this.roundScore(overallScore),

      verdict: overallVerdict,

      supportedClaims: supportedClaims,

      refutedClaims: refutedClaims,

      notEnoughInfoClaims: notEnoughInfoClaims,

      uncertainClaims: uncertainClaims,
    };
  }

  /**
   * Convertit un verdict en valeur numérique.
   */
  private getVerdictScore(verdict: Verdict): number {
    switch (verdict) {
      /*
       * Les preuves soutiennent l'affirmation.
       */
      case "SUPPORTED":
        return 1.0;

      /*
       * Les preuves réfutent l'affirmation.
       */
      case "REFUTED":
        return 0.0;

      /*
       * Pas suffisamment de preuves.
       */
      case "NOT_ENOUGH_INFO":
        return 0.5;

      /*
       * Résultat ambigu.
       */
      case "UNCERTAIN":
        return 0.5;

      /*
       * Sécurité au cas où un nouveau verdict
       * serait ajouté plus tard.
       */
      default:
        return 0.5;
    }
  }

  /**
   * Détermine le verdict global de la page.
   */
  private determineOverallVerdict(
    score: number,
    supportedClaims: number,
    refutedClaims: number,
    notEnoughInfoClaims: number,
    uncertainClaims: number,
    totalClaims: number,
  ): Verdict {
    /*
     * Si une majorité importante des affirmations
     * est réfutée, la page est considérée comme réfutée.
     */
    if (totalClaims > 0 && refutedClaims / totalClaims >= 0.5 && score < 0.4) {
      return "REFUTED";
    }

    /*
     * Si une majorité des affirmations est soutenue
     * et que le score global est élevé.
     */
    if (
      totalClaims > 0 &&
      supportedClaims / totalClaims >= 0.5 &&
      score >= 0.65
    ) {
      return "SUPPORTED";
    }

    /*
     * Trop d'incertitude ou pas assez d'informations.
     */
    const uncertainRatio =
      (notEnoughInfoClaims + uncertainClaims) / totalClaims;

    if (uncertainRatio >= 0.5) {
      return "NOT_ENOUGH_INFO";
    }

    /*
     * Cas intermédiaire :
     * les preuves sont contradictoires.
     */
    return "UNCERTAIN";
  }

  /**
   * Limite une valeur à un intervalle donné.
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
   * Arrondit le score à deux décimales.
   */
  private roundScore(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

/**
 * Instance du service utilisée
 * par analysis.service.ts.
 */
export const scoringService = new ScoringService();
