import type { RabbitHoleContent } from "../types/rabbit-hole";

export interface ChainSignals { repetition: number; thematicEnclosure: number; escalation: number; }

export class ContentChainService {
  analyze(contents: RabbitHoleContent[]): ChainSignals {
    if (contents.length < 2) return { repetition: 0, thematicEnclosure: 0, escalation: 0 };
    const normalized = contents.map((content) => content.text.toLocaleLowerCase().split(/\s+/).filter((word) => word.length > 4));
    const vocabulary = new Set(normalized.flat());
    const repeatedWords = normalized.reduce((total, words) => total + words.filter((word) => vocabulary.has(word)).length, 0);
    const repetition = Math.min(1, repeatedWords / Math.max(1, contents.length * 20));
    const thematicEnclosure = Math.min(1, vocabulary.size < contents.length * 12 ? 0.7 : 0.1);
    const escalation = contents.filter((content) => /extrême|violent|radical|haine/i.test(content.text)).length / contents.length;
    return { repetition, thematicEnclosure, escalation };
  }
}
export const contentChainService = new ContentChainService();
