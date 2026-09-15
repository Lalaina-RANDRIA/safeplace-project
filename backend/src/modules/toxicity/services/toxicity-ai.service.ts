import type { ToxicityAiStatus, ToxicityCategory, ToxicityModelSignal, ToxicitySignal } from "../types/toxicity";

export interface ToxicityAiProviderResult {
  categories: Array<{ category: ToxicityCategory; confidence: number; explanation?: string }>;
  modelSignal?: ToxicityModelSignal;
}

export interface ToxicityAiProvider {
  analyze(content: string): Promise<ToxicityAiProviderResult>;
}

export interface ToxicityAiResult {
  available: boolean;
  status: ToxicityAiStatus;
  signals: ToxicitySignal[];
  categories: ToxicityCategory[];
  modelSignal?: ToxicityModelSignal;
  reason?: string;
}

const ALLOWED_CATEGORIES = new Set<ToxicityCategory>([
  "INSULT", "HARASSMENT", "THREAT", "HATE", "SEXUAL_HARASSMENT",
  "AGGRESSION", "BULLYING", "PROVOCATION", "OTHER",
]);

export class ToxicityAiService {
  constructor(private readonly provider?: ToxicityAiProvider) {}

  async analyze(content: string): Promise<ToxicityAiResult> {
    if (!this.provider) {
      return { available: false, status: "NOT_CONFIGURED", signals: [], categories: [], reason: "Aucun fournisseur IA de toxicité n'est configuré." };
    }

    try {
      const result = await this.provider.analyze(content);
      const signals = result.categories
        .filter((item) => ALLOWED_CATEGORIES.has(item.category))
        .map((item) => ({
          category: item.category,
          score: Math.max(0, Math.min(1, item.confidence)),
          confidence: Math.max(0, Math.min(1, item.confidence)),
          source: "AI" as const,
          explanation: item.explanation,
        }));
      return { available: true, status: "AVAILABLE", signals, categories: [...new Set(signals.map((signal) => signal.category))], modelSignal: result.modelSignal };
    } catch (error) {
      return { available: false, status: "ERROR", signals: [], categories: [], reason: error instanceof Error ? error.message : "Le fournisseur IA a échoué." };
    }
  }
}
export const toxicityAiService = new ToxicityAiService();
