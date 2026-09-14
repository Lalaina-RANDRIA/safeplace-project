import type { ScamVerdict } from "../types/scam.ts";

export interface ScamScoringInput {
  urlScore: number;
  contentScore: number;
  identityScore: number;
  reputationScore?: number;
}

export interface ScamScore extends ScamScoringInput {
  score: number;
  verdict: ScamVerdict;
}

export const SCORING_WEIGHTS = {
  url: 0.2,
  content: 0.3,
  identity: 0.15,
  reputation: 0.1,
} as const;

export const VERDICT_THRESHOLDS = {
  critical: 0.85,
  high: 0.65,
  medium: 0.35,
} as const;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

export class ScamScoringService {
  calculate(input: ScamScoringInput): ScamScore {
    const urlScore = clamp(input.urlScore);
    const contentScore = clamp(input.contentScore);
    const identityScore = clamp(input.identityScore);

    const components: Array<[number, number]> = [
      [urlScore, SCORING_WEIGHTS.url],
      [contentScore, SCORING_WEIGHTS.content],
      [identityScore, SCORING_WEIGHTS.identity],
    ];

    if (input.reputationScore !== undefined) {
      components.push([
        clamp(input.reputationScore),
        SCORING_WEIGHTS.reputation,
      ]);
    }

    const activeWeight = components.reduce(
      (total, [, weight]) => total + weight,
      0,
    );

    const weightedScore = components.reduce(
      (total, [value, weight]) => total + value * weight,
      0,
    );

    const score =
      activeWeight === 0
        ? 0
        : Math.round((weightedScore / activeWeight) * 100) / 100;

    const verdict = this.toVerdict(score, {
      urlScore,
      contentScore,
      identityScore,
      reputationScore:
        input.reputationScore !== undefined
          ? clamp(input.reputationScore)
          : undefined,
    });

    return {
      ...input,
      score,
      verdict,
    };
  }

  private toVerdict(score: number, input: ScamScoringInput): ScamVerdict {
    const components: number[] = [
      input.urlScore,
      input.contentScore,
      input.identityScore,
    ];

    if (input.reputationScore !== undefined) {
      components.push(input.reputationScore);
    }

    const hasMeaningfulData = components.some((value) => value > 0);

    if (!hasMeaningfulData) {
      return "UNKNOWN";
    }

    const strongComponents = components.filter((value) => value >= 0.6).length;

    if (score >= VERDICT_THRESHOLDS.critical && strongComponents >= 2) {
      return "CRITICAL_RISK";
    }

    if (score >= VERDICT_THRESHOLDS.high && strongComponents >= 2) {
      return "HIGH_RISK";
    }

    if (score >= VERDICT_THRESHOLDS.medium) {
      return "MEDIUM_RISK";
    }

    return "LOW_RISK";
  }
}

export const scamScoringService = new ScamScoringService();
