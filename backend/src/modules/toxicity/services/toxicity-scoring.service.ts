import type { ToxicityCategory, ToxicityVerdict } from "../types/toxicity";

export interface ToxicityScore { score: number; verdict: ToxicityVerdict; }
export class ToxicityScoringService {
  calculate(categories: ToxicityCategory[]): ToxicityScore {
    const score = Math.min(1, categories.reduce((total, category) => total + (category === "THREAT" || category === "HATE" ? 0.45 : 0.2), 0));
    const verdict: ToxicityVerdict = score >= 0.8 ? "CRITICAL_RISK" : score >= 0.55 ? "HIGH_RISK" : score >= 0.25 ? "MEDIUM_RISK" : "LOW_RISK";
    return { score: Math.round(score * 100) / 100, verdict };
  }
}
export const toxicityScoringService = new ToxicityScoringService();
