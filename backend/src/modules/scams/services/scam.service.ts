import type { ScamAnalysisInput, ScamAnalysisResult, ScamSignal } from "../types/scam.ts";
import { scamContentService } from "./scam-content.service.ts";
import { scamIdentityService } from "./scam-identity.service.ts";
import { scamScoringService } from "./scam-scoring.service.ts";
import { scamUrlService } from "./scam-url.service.ts";

export class ScamService {
  analyze(input: ScamAnalysisInput): ScamAnalysisResult {
    const urlResult = scamUrlService.analyze(input.url);
    const contentResult = scamContentService.analyze(`${input.title ?? ""} ${input.content}`);
    const identityResult = scamIdentityService.analyze(input.content, input.url);
    const signals = this.mergeSignals(urlResult.signals, contentResult.signals, identityResult.signals);
    const scoring = scamScoringService.calculate({
      urlScore: urlResult.score,
      contentScore: contentResult.score,
      identityScore: identityResult.score,
    });
    return {
      url: input.url,
      title: input.title,
      domain: urlResult.domain,
      score: scoring.score,
      verdict: scoring.verdict,
      urlScore: scoring.urlScore,
      contentScore: scoring.contentScore,
      identityScore: scoring.identityScore,
      signals,
      explanation: signals.length === 0 ? "Aucun signal d'arnaque détecté." : `${signals.length} signal(s) nécessitent une vérification.`,
      analyzedAt: new Date().toISOString(),
    };
  }

  private mergeSignals(...groups: ScamSignal[][]): ScamSignal[] {
    const signals = new Map<string, ScamSignal>();
    for (const group of groups) {
      for (const signal of group) {
        const existing = signals.get(signal.type);
        if (!existing || signal.score * signal.confidence > existing.score * existing.confidence) {
          signals.set(signal.type, signal);
        }
      }
    }
    return [...signals.values()];
  }

}
export const scamService = new ScamService();
