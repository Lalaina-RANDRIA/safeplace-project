import type { RabbitHoleInput, RabbitHoleResult } from "../types/rabbit-hole";
import { contentChainService } from "./content-chain.service";
import { rabbitHoleScoringService } from "./rabbit-hole-scoring.service";
import { recommendationService } from "./recommendation.service";

export class RabbitHoleService {
  analyze(input: RabbitHoleInput): RabbitHoleResult {
    const chain = contentChainService.analyze(input.contents);
    const recommendationCount = recommendationService.countLinks(input.contents);
    const scoring = rabbitHoleScoringService.calculate(chain, recommendationCount);
    const indicators: string[] = [];
    if (chain.repetition > 0.4) indicators.push("REPEATED_CONTENT");
    if (chain.thematicEnclosure > 0.4) indicators.push("THEMATIC_ENCLOSURE");
    if (chain.escalation > 0.2) indicators.push("INCREASING_EXTREMITY");
    if (recommendationCount > 0) indicators.push("RECOMMENDATION_CHAIN");
    return {
      url: input.url,
      score: scoring.score,
      verdict: scoring.verdict,
      indicators,
      explanation: indicators.length === 0 ? "Aucune tendance préoccupante détectée dans cette chaîne de contenus." : "Cette analyse décrit une tendance de contenus observée, pas un jugement sur l'utilisateur.",
      analyzedAt: new Date().toISOString(),
    };
  }
}
export const rabbitHoleService = new RabbitHoleService();
