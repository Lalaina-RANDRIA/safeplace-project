import type { ToxicityInput, ToxicityResult } from "../types/toxicity";
import { toxicityAiService } from "./toxicity-ai.service";
import { toxicityPatternService } from "./toxicity-pattern.service";
import { toxicityScoringService } from "./toxicity-scoring.service";

export class ToxicityService {
  analyze(input: ToxicityInput): ToxicityResult {
    const content = `${input.title ?? ""} ${input.content}`;
    const patternCategories = toxicityPatternService.detect(content);
    const aiResult = toxicityAiService.analyze(content);
    const categories = [...new Set([...patternCategories, ...aiResult.categories])];
    const scoring = toxicityScoringService.calculate(categories);
    return {
      url: input.url,
      score: scoring.score,
      verdict: scoring.verdict,
      categories,
      aiAvailable: aiResult.available,
      explanation: categories.length === 0 ? "Aucun signal de toxicité explicite détecté; une opinion négative n'est pas considérée comme toxique." : `${categories.length} catégorie(s) détectée(s) par les règles locales.`,
      analyzedAt: new Date().toISOString(),
    };
  }
}
export const toxicityService = new ToxicityService();
