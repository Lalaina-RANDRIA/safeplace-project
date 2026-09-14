import type { ToxicityCategory } from "../types/toxicity";

export interface ToxicityAiResult { available: false; categories: ToxicityCategory[]; reason: string; }

export class ToxicityAiService {
  analyze(_content: string): ToxicityAiResult {
    return { available: false, categories: [], reason: "Aucun fournisseur IA de toxicité n'est configuré." };
  }
}
export const toxicityAiService = new ToxicityAiService();
