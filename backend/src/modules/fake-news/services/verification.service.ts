import type { Claim, ClaimAnalysis, Verdict } from "../types/analysis";

import type {
  Evidence,
  EvidenceStance,
  SourceReliability,
} from "../types/evidence";

/**
 * Service responsable de la vérification
 * des affirmations à partir des preuves disponibles.
 */
export class VerificationService {
  /**
   * Vérifie plusieurs affirmations.
   *
   * @param claims Liste des affirmations à vérifier.
   * @param searchResults Preuves provenant de la recherche Web.
   * @param factCheckResults Preuves provenant des fact-checks.
   */
  async verifyClaims(
    claims: Claim[],
    searchResults: Map<string, Evidence[]>,
    factCheckResults: Map<string, Evidence[]>,
  ): Promise<ClaimAnalysis[]> {
    const analyses: ClaimAnalysis[] = [];

    /*
     * On traite chaque affirmation individuellement.
     */
    for (const claim of claims) {
      const searchEvidence = searchResults.get(claim.text) || [];

      const factCheckEvidence = factCheckResults.get(claim.text) || [];

      /*
       * Fusion des deux catégories de preuves.
       */
      const allEvidence = this.mergeEvidence(searchEvidence, factCheckEvidence);

      /*
       * Vérification de l'affirmation.
       */
      const analysis = this.verifyClaim(claim, allEvidence);

      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Vérifie une seule affirmation.
   */
  private verifyClaim(claim: Claim, evidence: Evidence[]): ClaimAnalysis {
    /*
     * Une affirmation qui n'est pas vérifiable
     * ne doit pas être forcée vers TRUE/FALSE.
     */
    if (!claim.checkable) {
      return {
        claim: claim,
        verdict: "NOT_ENOUGH_INFO",
        confidence: 0.2,
        explanation:
          "Cette affirmation ne peut pas être vérifiée automatiquement avec les sources disponibles.",
        evidence: evidence,
      };
    }

    /*
     * Absence totale de preuves.
     */
    if (evidence.length === 0) {
      return {
        claim: claim,
        verdict: "NOT_ENOUGH_INFO",
        confidence: 0.1,
        explanation:
          "Aucune preuve suffisamment pertinente n'a été trouvée pour vérifier cette affirmation.",
        evidence: [],
      };
    }

    /*
     * Calcul des scores de soutien et de contradiction.
     */
    const supportScore = this.calculateStanceScore(evidence, "SUPPORTS");

    const refuteScore = this.calculateStanceScore(evidence, "REFUTES");

    /*
     * Score d'information disponible.
     *
     * Plus les preuves sont nombreuses et pertinentes,
     * plus le système peut avoir confiance dans son résultat.
     */
    const evidenceQuality = this.calculateEvidenceQuality(evidence);

    /*
     * Détermination du verdict.
     */
    const verdict = this.determineVerdict(
      supportScore,
      refuteScore,
      evidenceQuality,
    );

    /*
     * Calcul de la confiance.
     */
    const confidence = this.calculateConfidence(
      verdict,
      supportScore,
      refuteScore,
      evidenceQuality,
    );

    /*
     * Génération d'une explication lisible.
     */
    const explanation = this.buildExplanation(
      verdict,
      evidence,
      supportScore,
      refuteScore,
    );

    return {
      claim: claim,

      verdict: verdict,

      confidence: this.roundScore(confidence),

      explanation: explanation,

      evidence: evidence,
    };
  }

  /**
   * Fusionne les preuves du moteur de recherche
   * et celles provenant des fact-checks.
   *
   * Les doublons sont supprimés lorsque plusieurs
   * services retournent exactement la même URL.
   * Déduplication également par domaine pour éviter
   * le double comptage de la même source.
   */
  private mergeEvidence(
    searchEvidence: Evidence[],
    factCheckEvidence: Evidence[],
  ): Evidence[] {
    const merged: Evidence[] = [];

    const urls = new Set<string>();
    const domains = new Set<string>();

    /*
     * Ajout des fact-checks en premier (priorité plus haute).
     */
    for (const evidence of factCheckEvidence) {
      if (urls.has(evidence.url)) {
        continue;
      }

      try {
        const domain = new URL(evidence.url).hostname;
        if (domains.has(domain)) {
          continue; // Déjà une preuve de ce domaine
        }
        domains.add(domain);
      } catch {
        // Ignore si URL invalide
      }

      urls.add(evidence.url);
      merged.push(evidence);
    }

    /*
     * Ajout des résultats du moteur de recherche.
     */
    for (const evidence of searchEvidence) {
      if (urls.has(evidence.url)) {
        continue;
      }

      try {
        const domain = new URL(evidence.url).hostname;
        if (domains.has(domain)) {
          continue; // Déjà une preuve de ce domaine (fact-check ou autre recherche)
        }
        domains.add(domain);
      } catch {
        // Ignore si URL invalide
      }

      urls.add(evidence.url);
      merged.push(evidence);
    }

    /*
     * Classement par pertinence.
     */
    merged.sort(
      (premierePreuve, deuxiemePreuve) =>
        deuxiemePreuve.relevanceScore - premierePreuve.relevanceScore,
    );

    return merged;
  }

  /**
   * Calcule un score correspondant
   * à une position donnée :
   *
   * SUPPORTS ou REFUTES.
   */
  private calculateStanceScore(
    evidence: Evidence[],
    stance: EvidenceStance,
  ): number {
    let totalScore = 0;

    for (const item of evidence) {
      /*
       * On ignore les preuves qui n'ont pas
       * la position recherchée.
       */
      if (item.stance !== stance) {
        continue;
      }

      /*
       * Pertinence de la preuve.
       */
      const relevance = this.clamp(item.relevanceScore, 0, 1);

      /*
       * Confiance attribuée à la preuve.
       */
      const confidence = this.clamp(item.confidenceScore, 0, 1);

      /*
       * Fiabilité de la source.
       */
      const reliability = this.getReliabilityScore(item.reliability);

      /*
       * Poids final de la preuve.
       */
      const weight = relevance * confidence * reliability;

      totalScore += weight;
    }

    return totalScore;
  }

  /**
   * Calcule la qualité globale des preuves.
   */
  private calculateEvidenceQuality(evidence: Evidence[]): number {
    if (evidence.length === 0) {
      return 0;
    }

    let total = 0;

    for (const item of evidence) {
      const relevance = this.clamp(item.relevanceScore, 0, 1);

      const confidence = this.clamp(item.confidenceScore, 0, 1);

      const reliability = this.getReliabilityScore(item.reliability);

      total += relevance * confidence * reliability;
    }

    /*
     * On considère qu'environ trois bonnes
     * preuves représentent déjà une qualité élevée.
     */
    const normalized = total / 3;

    return this.clamp(normalized, 0, 1);
  }

  /**
   * Détermine le verdict à partir des scores.
   */
  private determineVerdict(
    supportScore: number,
    refuteScore: number,
    evidenceQuality: number,
  ): Verdict {
    /*
     * Les preuves sont trop faibles.
     */
    if (evidenceQuality < 0.2) {
      return "NOT_ENOUGH_INFO";
    }

    /*
     * Aucun camp ne domine suffisamment.
     */
    if (supportScore < 0.25 && refuteScore < 0.25) {
      return "NOT_ENOUGH_INFO";
    }

    /*
     * Vérification du rapport entre les deux camps.
     */
    const difference = Math.abs(supportScore - refuteScore);

    /*
     * Résultats trop proches :
     * les preuves sont contradictoires.
     */
    if (difference < 0.2) {
      return "UNCERTAIN";
    }

    /*
     * Les preuves favorisent la véracité.
     */
    if (supportScore > refuteScore && supportScore >= 0.35) {
      return "SUPPORTED";
    }

    /*
     * Les preuves favorisent la réfutation.
     */
    if (refuteScore > supportScore && refuteScore >= 0.35) {
      return "REFUTED";
    }

    /*
     * Cas par défaut.
     */
    return "UNCERTAIN";
  }

  /**
   * Calcule la confiance finale du verdict.
   */
  private calculateConfidence(
    verdict: Verdict,
    supportScore: number,
    refuteScore: number,
    evidenceQuality: number,
  ): number {
    /*
     * Pour un manque de preuves,
     * la confiance doit rester faible.
     */
    if (verdict === "NOT_ENOUGH_INFO") {
      return Math.min(evidenceQuality, 0.4);
    }

    /*
     * Pour une situation contradictoire,
     * la confiance doit également rester limitée.
     */
    if (verdict === "UNCERTAIN") {
      return Math.min(evidenceQuality, 0.6);
    }

    /*
     * Force du camp dominant.
     */
    const dominantScore = Math.max(supportScore, refuteScore);

    /*
     * Différence entre les deux camps.
     */
    const difference = Math.abs(supportScore - refuteScore);

    /*
     * Combinaison :
     *
     * - force du camp dominant
     * - différence entre les camps
     * - qualité des preuves
     */
    const confidence =
      dominantScore * 0.4 + difference * 0.3 + evidenceQuality * 0.3;

    return this.clamp(confidence, 0, 1);
  }

  /**
   * Génère une explication destinée à l'utilisateur.
   */
  private buildExplanation(
    verdict: Verdict,
    evidence: Evidence[],
    supportScore: number,
    refuteScore: number,
  ): string {
    const supportingSources = this.countStance(evidence, "SUPPORTS");

    const refutingSources = this.countStance(evidence, "REFUTES");

    const neutralSources = this.countStance(evidence, "NEUTRAL");

    switch (verdict) {
      case "SUPPORTED":
        return (
          "Les preuves disponibles soutiennent cette affirmation. " +
          "SafePlace a trouvé " +
          supportingSources +
          " preuve(s) favorisant l'affirmation contre " +
          refutingSources +
          " preuve(s) la contredisant."
        );

      case "REFUTED":
        return (
          "Les preuves disponibles contredisent cette affirmation. " +
          "SafePlace a trouvé " +
          refutingSources +
          " preuve(s) la réfutant contre " +
          supportingSources +
          " preuve(s) la soutenant."
        );

      case "NOT_ENOUGH_INFO":
        return (
          "Les sources consultées ne fournissent pas suffisamment " +
          "de preuves pour confirmer ou réfuter cette affirmation. " +
          "Nombre total de sources analysées : " +
          evidence.length +
          "."
        );

      case "UNCERTAIN":
        return (
          "Les sources disponibles présentent des informations " +
          "contradictoires ou insuffisamment concluantes. " +
          "SafePlace recommande une vérification supplémentaire."
        );

      default:
        return "Le résultat de la vérification est indéterminé.";
    }
  }

  /**
   * Compte le nombre de preuves ayant une position donnée.
   */
  private countStance(evidence: Evidence[], stance: EvidenceStance): number {
    let count = 0;

    for (const item of evidence) {
      if (item.stance === stance) {
        count++;
      }
    }

    return count;
  }

  /**
   * Convertit la fiabilité en valeur numérique.
   */
  private getReliabilityScore(reliability: SourceReliability): number {
    switch (reliability) {
      case "VERY_HIGH":
        return 1.0;

      case "HIGH":
        return 0.85;

      case "MEDIUM":
        return 0.65;

      case "LOW":
        return 0.35;

      case "UNKNOWN":
        return 0.5;

      default:
        return 0.5;
    }
  }

  /**
   * Limite une valeur dans un intervalle.
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
   * Arrondit un score à deux décimales.
   */
  private roundScore(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

/**
 * Instance utilisée par analysis.service.ts.
 */
export const verificationService = new VerificationService();
