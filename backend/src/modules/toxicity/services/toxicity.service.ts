import type { ToxicityInput, ToxicityResult } from "../types/toxicity";
import { toxicityAiService } from "./toxicity-ai.service";
import { toxicityPatternService } from "./toxicity-pattern.service";
import { toxicityScoringService } from "./toxicity-scoring.service";
import { toxicityNormalizationService } from "./toxicity-normalization.service";

const ONNX_MODEL_THRESHOLD = 0.7;

export class ToxicityService {
  async analyze(input: ToxicityInput): Promise<ToxicityResult> {
    const originalContent = `${input.title ?? ""} ${input.content}`;
    const content = toxicityNormalizationService.normalize(originalContent);
    const patternSignals = toxicityPatternService.detect(content);
    const aiResult = await toxicityAiService.analyze(originalContent);
    const signals = [...patternSignals, ...aiResult.signals];
    const uniqueSignals = [...new Map(signals.map((signal) => [signal.category, signal])).values()];
    const categories = uniqueSignals.map((signal) => signal.category);
    const activeModelSignal = aiResult.modelSignal && aiResult.modelSignal.toxicProbability >= ONNX_MODEL_THRESHOLD ? aiResult.modelSignal : undefined;
    const scoring = toxicityScoringService.calculate(uniqueSignals, activeModelSignal);

    const hasPatternDetection = categories.length > 0;
    const hasStrongModelSignal = Boolean(activeModelSignal);
    const explanation = !hasPatternDetection && !hasStrongModelSignal
      ? "Aucun signal explicite de toxicité n'a été détecté."
      : [
          hasPatternDetection ? `Des signaux de ${categories.map((category) => category.toLowerCase()).join(", ")} ont été détectés.` : null,
          activeModelSignal ? `Le modèle ONNX a produit un signal binaire de toxicité (probabilité toxique ${activeModelSignal.toxicProbability.toFixed(2)}).` : null,
        ].filter(Boolean).join(" ");

    return {
      url: input.url,
      score: scoring.score,
      verdict: scoring.verdict,
      categories,
      aiAvailable: aiResult.available,
      aiStatus: aiResult.status,
      modelSignal: activeModelSignal,
      signals: uniqueSignals,
      explanation,
      analyzedAt: new Date().toISOString(),
    };
  }
}
export const toxicityService = new ToxicityService();
