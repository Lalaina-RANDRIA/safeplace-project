import type { RabbitHoleContent, RabbitHoleFeatures } from "../types/rabbit-hole";

const TOKEN_PATTERN = /[a-zA-Z0-9]+(?:['-][a-zA-Z0-9]+)*/g;

export class FeatureExtractionService {
  extract(contents: RabbitHoleContent[]): RabbitHoleFeatures {
    if (!Array.isArray(contents) || contents.length === 0) {
      throw new Error("Le tableau de contenus est obligatoire.");
    }

    const normalized = contents.map((content) => this.normalizeContent(content));
    const sequenceLength = normalized.length;
    const uniqueVideos = new Set(normalized.map((content) => content.id)).size;
    const repetitionScore = this.calculateRepetitionScore(normalized);
    const diversityScore = this.clamp(1 - repetitionScore, 0, 1);
    const clickDepth = this.calculateClickDepth(normalized);
    const sessionTime = this.calculateSessionTime(normalized);

    return {
      sequenceLength,
      clickDepth,
      sessionTime,
      uniqueVideos,
      repetitionScore,
      diversityScore,
    };
  }

  private normalizeContent(content: RabbitHoleContent): RabbitHoleContent & { tokens: Set<string> } {
    if (typeof content.id !== "string" || content.id.trim().length === 0) {
      throw new Error("Chaque contenu doit avoir un identifiant string valide.");
    }
    if (typeof content.text !== "string" || content.text.trim().length === 0) {
      throw new Error("Chaque contenu doit avoir un texte non vide.");
    }
    const text = content.text.trim();
    const tokens = new Set<string>();
    const matches = text.toLowerCase().match(TOKEN_PATTERN) ?? [];
    for (const token of matches) {
      if (token.length > 2) tokens.add(token);
    }
    return { ...content, id: content.id.trim(), text, tokens };
  }

  private calculateRepetitionScore(contents: Array<RabbitHoleContent & { tokens: Set<string> }>): number {
    if (contents.length < 2) return 0;

    let pairCount = 0;
    let totalSimilarity = 0;
    for (let i = 0; i < contents.length; i += 1) {
      const leftTokens = contents[i]?.tokens ?? new Set<string>();
      for (let j = i + 1; j < contents.length; j += 1) {
        pairCount += 1;
        const rightTokens = contents[j]?.tokens ?? new Set<string>();
        totalSimilarity += this.jaccardSimilarity(leftTokens, rightTokens);
      }
    }

    return pairCount === 0 ? 0 : this.clamp(totalSimilarity / pairCount, 0, 1);
  }

  private jaccardSimilarity(left: Set<string>, right: Set<string>): number {
    if (left.size === 0 && right.size === 0) return 1;
    if (left.size === 0 || right.size === 0) return 0;
    const intersection = [...left].filter((token) => right.has(token)).length;
    const union = new Set([...left, ...right]).size;
    return union === 0 ? 0 : intersection / union;
  }

  private calculateClickDepth(contents: Array<RabbitHoleContent & { tokens: Set<string> }>): number {
    const byId = new Map(contents.map((content) => [content.id, content]));
    const memo = new Map<string, number>();

    const resolveDepth = (contentId: string): number => {
      if (memo.has(contentId)) return memo.get(contentId)!;
      const content = byId.get(contentId);
      if (!content || typeof content.recommendedFrom !== "string" || content.recommendedFrom.trim().length === 0) {
        memo.set(contentId, 0);
        return 0;
      }
      const parentId = content.recommendedFrom.trim();
      const parent = byId.get(parentId);
      if (!parent) {
        memo.set(contentId, 0);
        return 0;
      }
      const depth = resolveDepth(parentId) + 1;
      memo.set(contentId, depth);
      return depth;
    };

    let maxDepth = 0;
    for (const content of contents) {
      maxDepth = Math.max(maxDepth, resolveDepth(content.id));
    }
    return maxDepth;
  }

  private calculateSessionTime(contents: Array<RabbitHoleContent & { tokens: Set<string> }>): number {
    const validTimestamps = contents
      .map((content) => {
        if (typeof content.timestamp !== "string" || content.timestamp.trim().length === 0) return null;
        const time = Date.parse(content.timestamp);
        return Number.isNaN(time) ? null : time;
      })
      .filter((time): time is number => time !== null);

    if (validTimestamps.length < 2) return 0;

    const minTime = Math.min(...validTimestamps);
    const maxTime = Math.max(...validTimestamps);
    return this.clamp((maxTime - minTime) / 1000, 0, Number.MAX_SAFE_INTEGER);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
export const featureExtractionService = new FeatureExtractionService();
