import type { RabbitHoleContent } from "../types/rabbit-hole";

export interface ChainSignals {
  repetition: number;
  thematicEnclosure: number;
  escalation: number;
  similarity: number;
  temporalProgression: number;
}

export class ContentChainService {
  analyze(contents: RabbitHoleContent[]): ChainSignals {
    if (!Array.isArray(contents) || contents.length === 0) {
      return { repetition: 0, thematicEnclosure: 0, escalation: 0, similarity: 0, temporalProgression: 0 };
    }

    const normalized = contents.map((content) => this.normalize(content.text));
    const similarity = this.calculateSimilarity(normalized);
    const repetition = Math.min(1, similarity);
    const thematicEnclosure = this.calculateThematicEnclosure(normalized, similarity);
    const escalation = this.calculateEscalation(contents);
    const temporalProgression = this.calculateTemporalProgression(contents);

    return {
      repetition,
      thematicEnclosure,
      escalation,
      similarity,
      temporalProgression,
    };
  }

  private normalize(text: string): string[] {
    return (text.toLocaleLowerCase().match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g) ?? []).filter((token) => token.length > 2);
  }

  private calculateSimilarity(texts: string[][]): number {
    if (texts.length < 2) return 0;

    const pairScores: number[] = [];
    for (let i = 0; i < texts.length; i += 1) {
      for (let j = i + 1; j < texts.length; j += 1) {
        const left = new Set(texts[i]);
        const right = new Set(texts[j]);
        const union = new Set([...left, ...right]).size;
        if (union === 0) {
          pairScores.push(1);
          continue;
        }
        const intersection = [...left].filter((token) => right.has(token)).length;
        pairScores.push(intersection / union);
      }
    }
    return pairScores.length === 0 ? 0 : Math.min(1, pairScores.reduce((sum, value) => sum + value, 0) / pairScores.length);
  }

  private calculateThematicEnclosure(texts: string[][], similarity: number): number {
    if (texts.length === 0) return 0;
    const allTokens = new Set(texts.flat());
    const tokenDensity = allTokens.size / Math.max(1, texts.flat().length);
    return Math.min(1, similarity * 0.7 + (1 - tokenDensity) * 0.3);
  }

  private calculateEscalation(contents: RabbitHoleContent[]): number {
    if (contents.length < 2) return 0;
    const riskyTerms = ["violent", "extrême", "radical", "haine", "menace", "urgence", "alarmant"];
    const scores = contents.map((content) => {
      const text = content.text.toLocaleLowerCase();
      const hits = riskyTerms.filter((term) => text.includes(term)).length;
      return hits / riskyTerms.length;
    });
    let ascents = 0;
    for (let i = 1; i < scores.length; i += 1) {
      const previous = scores[i - 1] ?? 0;
      const current = scores[i] ?? 0;
      if (current > previous) ascents += 1;
    }
    return Math.min(1, ascents / Math.max(1, scores.length - 1));
  }

  private calculateTemporalProgression(contents: RabbitHoleContent[]): number {
    const timestamps = contents
      .map((content) => content.timestamp)
      .filter((timestamp): timestamp is string => typeof timestamp === "string" && timestamp.trim().length > 0)
      .map((timestamp) => Date.parse(timestamp))
      .filter((value) => !Number.isNaN(value));

    if (timestamps.length < 2) return 0;
    const ordered = [...timestamps].sort((a, b) => a - b);
    const first = ordered[0] ?? 0;
    const last = ordered[ordered.length - 1] ?? first;
    const duration = Math.max(1, last - first);
    const spread = Math.max(0, last - first);
    return Math.min(1, spread / duration);
  }
}
export const contentChainService = new ContentChainService();
