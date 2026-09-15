import type { ToxicityModelSignal, ToxicitySignal, ToxicityVerdict } from "../types/toxicity";

export interface ToxicityScore { score: number; verdict: ToxicityVerdict; }
export class ToxicityScoringService {
  calculate(signals: ToxicitySignal[], modelSignal?: ToxicityModelSignal): ToxicityScore {
    const patternScore = signals.length === 0
      ? 0
      : Math.min(1, signals.reduce((total, signal) => total + signal.score * signal.confidence, 0) / Math.max(1, signals.length));

    const modelBonus = modelSignal ? Math.max(0, modelSignal.toxicProbability - 0.7) * 0.5 : 0;
    const score = Math.min(1, patternScore + modelBonus);
    const hasStrongThreat = signals.some((signal) => signal.category === "THREAT" && signal.score >= 0.8 && signal.confidence >= 0.8);
    const verdict: ToxicityVerdict = hasStrongThreat && score >= 0.8 ? "CRITICAL_RISK" : score >= 0.65 ? "HIGH_RISK" : score >= 0.3 ? "MEDIUM_RISK" : "LOW_RISK";
    return { score: Math.round(score * 100) / 100, verdict };
  }
}
export const toxicityScoringService = new ToxicityScoringService();
