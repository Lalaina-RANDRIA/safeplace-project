import type { Claim, Verdict } from "../types/analysis";
import type { Evidence } from "../types/evidence";
import type { LlmProvider } from "../providers/llm.provider";

export interface LlmSynthesis {
  verdict: Verdict;
  confidence: number;
  explanation: string;
  supportingEvidenceIds: string[];
  refutingEvidenceIds: string[];
}

export class SynthesisService {
  constructor(private readonly llmProvider?: LlmProvider) {}

  async synthesize(claim: Claim, evidence: Evidence[]): Promise<LlmSynthesis | undefined> {
    if (!this.llmProvider || evidence.length === 0) return undefined;

    const prompt = JSON.stringify({ claim: claim.text, evidence: evidence.map(({ id, title, excerpt, url }) => ({ id, title, excerpt, url })) });
    try {
      const result = await this.llmProvider.generateStructured<LlmSynthesis>(prompt, {
        verdict: ["SUPPORTED", "REFUTED", "NOT_ENOUGH_INFO", "UNCERTAIN"],
      });
      return this.validate(result, evidence);
    } catch {
      return undefined;
    }
  }

  private validate(result: LlmSynthesis, evidence: Evidence[]): LlmSynthesis | undefined {
    if (!result || !["SUPPORTED", "REFUTED", "NOT_ENOUGH_INFO", "UNCERTAIN"].includes(result.verdict)) return undefined;
    const validIds = new Set(evidence.map((item) => item.id));
    const supportingEvidenceIds = result.supportingEvidenceIds.filter((id) => validIds.has(id));
    const refutingEvidenceIds = result.refutingEvidenceIds.filter((id) => validIds.has(id));
    return { ...result, confidence: Math.max(0, Math.min(1, result.confidence)), supportingEvidenceIds, refutingEvidenceIds };
  }
}

export const synthesisService = new SynthesisService();
