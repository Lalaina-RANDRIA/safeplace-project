import type { ScamContentAnalysis, ScamSignal } from "../types/scam.ts";

import { scamPatternService } from "./scam-pattern.service.ts";

/**
 * Service responsable de l'analyse du contenu textuel
 * d'une page afin d'identifier les signaux associés
 * à une éventuelle arnaque.
 */
export class ScamContentService {
  /**
   * Analyse le contenu fourni.
   *
   * Le service :
   * 1. normalise le texte ;
   * 2. détecte les patterns ;
   * 3. récupère les signaux détectés ;
   * 4. calcule un score global de contenu.
   */
  analyze(content: string): ScamContentAnalysis {
    /**
     * Normalisation du contenu.
     *
     * Plusieurs espaces, tabulations et retours à la ligne
     * sont remplacés par un seul espace.
     */
    const normalizedContent = this.normalizeContent(content);

    /**
     * Aucun contenu exploitable.
     */
    if (normalizedContent.length === 0) {
      return {
        score: 0,
        signals: [],
      };
    }

    /**
     * Détection des signaux par le moteur
     * de patterns.
     */
    const signals = scamPatternService.detect(normalizedContent);

    /**
     * Calcul du score global du contenu.
     */
    const score = this.calculateContentScore(signals);

    return {
      score,
      signals,
    };
  }

  /**
   * Normalise le texte avant analyse.
   */
  private normalizeContent(content: string): string {
    if (typeof content !== "string") {
      return "";
    }

    return content.replace(/\s+/g, " ").trim();
  }

  /**
   * Calcule le score global de risque du contenu
   * à partir des signaux détectés.
   *
   * Chaque signal contribue selon :
   *
   * score du signal × confiance du signal
   *
   * Une moyenne pondérée est utilisée afin d'éviter
   * qu'une simple accumulation de signaux fasse
   * immédiatement atteindre 1.
   */
  private calculateContentScore(signals: ScamSignal[]): number {
    if (signals.length === 0) {
      return 0;
    }

    /**
     * Somme des poids de confiance.
     */
    let totalWeight = 0;

    /**
     * Somme pondérée des scores.
     */
    let weightedScore = 0;

    for (const signal of signals) {
      /**
       * Protection contre des valeurs
       * qui sortiraient de l'intervalle [0, 1].
       */
      const signalScore = this.clamp(signal.score);

      const confidence = this.clamp(signal.confidence);

      /**
       * Le score du signal est pondéré
       * par sa confiance.
       */
      weightedScore += signalScore * confidence;

      totalWeight += confidence;
    }

    /**
     * Aucun poids exploitable.
     */
    if (totalWeight === 0) {
      return 0;
    }

    /**
     * Moyenne pondérée.
     */
    const score = weightedScore / totalWeight;

    /**
     * Arrondi à deux décimales
     * pour conserver un résultat propre.
     */
    return this.roundScore(this.clamp(score));
  }

  /**
   * Limite une valeur entre 0 et 1.
   */
  private clamp(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    if (value < 0) {
      return 0;
    }

    if (value > 1) {
      return 1;
    }

    return value;
  }

  /**
   * Arrondit un nombre à deux décimales.
   */
  private roundScore(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

/**
 * Instance partagée du service.
 */
export const scamContentService = new ScamContentService();
