import type { RabbitHoleFactors, RabbitHoleVerdict } from "../types/rabbit-hole";
import type { ChainSignals } from "./content-chain.service";

export interface RabbitHoleScore { score: number; verdict: RabbitHoleVerdict; factors: RabbitHoleFactors; }
export class RabbitHoleScoringService {
  calculate(signals: ChainSignals, recommendationScore: number): RabbitHoleScore {
    const topicRepetitionScore = signals.repetition;
    const similarityScore = signals.similarity;
    const escalationScore = signals.escalation;
    const temporalProgressionScore = signals.temporalProgression;
    const score = Math.min(1, topicRepetitionScore * 0.32 + similarityScore * 0.2 + escalationScore * 0.2 + temporalProgressionScore * 0.13 + recommendationScore * 0.15);
    const verdict: RabbitHoleVerdict = score >= 0.8 ? "HIGH_RISK" : score >= 0.5 ? "MEDIUM_RISK" : "LOW_RISK";
    return {
      score: Number(score.toFixed(3)),
      verdict,
      factors: {
        topicRepetitionScore: Number(topicRepetitionScore.toFixed(3)),
        recommendationScore: Number(recommendationScore.toFixed(3)),
        similarityScore: Number(similarityScore.toFixed(3)),
        escalationScore: Number(escalationScore.toFixed(3)),
        temporalProgressionScore: Number(temporalProgressionScore.toFixed(3)),
      },
    };
  }
}
export const rabbitHoleScoringService = new RabbitHoleScoringService();
