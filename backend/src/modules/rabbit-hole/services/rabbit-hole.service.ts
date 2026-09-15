import type { RabbitHoleInput, RabbitHoleModelProvider, RabbitHoleModelSource, RabbitHoleResult, RabbitHoleVerdict } from "../types/rabbit-hole";
import { onnxRabbitHoleModelProvider } from "./rabbit-hole-model-provider";
import { featureExtractionService } from "./feature-extraction.service";
import { rabbitHoleScoringService } from "./rabbit-hole-scoring.service";
import { recommendationService } from "./recommendation.service";

export interface RabbitHoleServiceOptions {
  modelProvider?: RabbitHoleModelProvider;
}

export class RabbitHoleService {
  constructor(private readonly options: RabbitHoleServiceOptions = { modelProvider: onnxRabbitHoleModelProvider }) {}

  async analyze(input: RabbitHoleInput): Promise<RabbitHoleResult> {
    const contents = input.contents ?? [];
    if (!Array.isArray(contents) || contents.length === 0) {
      throw new Error("Le tableau de contenus est obligatoire.");
    }

    const features = featureExtractionService.extract(contents);
    const recommendationScore = recommendationService.calculate(contents);
    const factors = rabbitHoleScoringService.calculate({
      repetition: features.repetitionScore,
      similarity: Math.max(0, 1 - features.diversityScore),
      escalation: Math.min(1, features.repetitionScore + recommendationScore * 0.3),
      thematicEnclosure: Math.min(1, 1 - features.diversityScore + recommendationScore * 0.2),
      temporalProgression: features.sessionTime > 0 ? Math.min(1, features.sessionTime / 600) : 0,
    }, recommendationScore).factors;

    let modelSource: RabbitHoleModelSource = "HEURISTIC";
    let modelConfidence: number | undefined;
    const heuristicOutcome = rabbitHoleScoringService.calculate({
      repetition: features.repetitionScore,
      similarity: Math.max(0, 1 - features.diversityScore),
      escalation: Math.min(1, features.repetitionScore + recommendationScore * 0.3),
      thematicEnclosure: Math.min(1, 1 - features.diversityScore + recommendationScore * 0.2),
      temporalProgression: features.sessionTime > 0 ? Math.min(1, features.sessionTime / 600) : 0,
    }, recommendationScore);

    let verdict = heuristicOutcome;

    if (this.options.modelProvider) {
      try {
        const prediction = await this.options.modelProvider.predict(features);
        modelSource = "ML";
        modelConfidence = prediction.probabilities?.[prediction.label] ?? 0.5;
        const mappedVerdict = {
          LOW: "LOW_RISK",
          MEDIUM: "MEDIUM_RISK",
          HIGH: "HIGH_RISK",
        }[prediction.label] ?? "UNKNOWN" as RabbitHoleVerdict;
        const mlScore = Math.min(1, (prediction.probabilities?.[prediction.label] ?? 0.5));
        verdict = { score: mlScore, verdict: mappedVerdict as RabbitHoleVerdict, factors: heuristicOutcome.factors } as typeof heuristicOutcome;
      } catch {
        modelSource = "HEURISTIC";
      }
    }

    const score = modelSource === "ML" ? Math.min(1, verdict.score) : heuristicOutcome.score;

    const indicators: string[] = [];
    if (features.repetitionScore > 0.5) indicators.push("REPEATED_CONTENT");
    if (features.diversityScore < 0.4) indicators.push("THEMATIC_ENCLOSURE");
    if (recommendationScore > 0.2) indicators.push("RECOMMENDATION_CHAIN");
    if (features.sessionTime > 0) indicators.push("TEMPORAL_PROGRESSION");

    return {
      url: input.url,
      score,
      verdict: modelSource === "ML" ? verdict.verdict ?? "UNKNOWN" : verdict.verdict,
      indicators,
      factors,
      modelSource,
      modelConfidence,
      explanation: indicators.length === 0 ? "Aucune tendance préoccupante détectée dans cette chaîne de contenus." : "Cette analyse décrit une tendance observée dans la séquence de contenus, pas un jugement sur un individu.",
      analyzedAt: new Date().toISOString(),
    };
  }
}
export const rabbitHoleService = new RabbitHoleService();
