import type { RabbitHoleVerdict } from "../types/rabbit-hole";
import type { ChainSignals } from "./content-chain.service";

export interface RabbitHoleScore { score: number; verdict: RabbitHoleVerdict; }
export class RabbitHoleScoringService {
  calculate(signals: ChainSignals, recommendationCount: number): RabbitHoleScore {
    const score = Math.min(1, signals.repetition * 0.35 + signals.thematicEnclosure * 0.3 + signals.escalation * 0.25 + Math.min(0.1, recommendationCount * 0.02));
    const verdict: RabbitHoleVerdict = score >= 0.8 ? "CRITICAL_RISK" : score >= 0.55 ? "HIGH_RISK" : score >= 0.25 ? "MEDIUM_RISK" : "LOW_RISK";
    return { score: Math.round(score * 100) / 100, verdict };
  }
}
export const rabbitHoleScoringService = new RabbitHoleScoringService();
