import type { RabbitHoleContent } from "../types/rabbit-hole";

export class RecommendationService {
  countLinks(contents: RabbitHoleContent[]): number {
    return contents.filter((content) => Boolean(content.recommendedFrom && content.recommendedFrom.trim().length > 0)).length;
  }

  calculate(contents: RabbitHoleContent[]): number {
    if (!Array.isArray(contents) || contents.length === 0) return 0;

    const validLinks = contents.filter((content) => typeof content.recommendedFrom === "string" && content.recommendedFrom.trim().length > 0);
    if (validLinks.length === 0) return 0;

    const uniqueParents = new Set(validLinks.map((content) => content.recommendedFrom!.trim()));
    const chainDepth = this.computeChainDepth(contents);
    const linkRatio = validLinks.length / contents.length;
    const score = Math.min(1, linkRatio * 0.6 + Math.min(chainDepth / 5, 1) * 0.4);
    return Number(score.toFixed(3));
  }

  private computeChainDepth(contents: RabbitHoleContent[]): number {
    const byId = new Map(contents.map((content) => [content.id, content]));
    let longest = 0;
    const seen = new Set<string>();

    const walk = (contentId: string, depth: number): number => {
      if (seen.has(contentId)) return depth;
      seen.add(contentId);
      const content = byId.get(contentId);
      if (!content || !content.recommendedFrom || !byId.has(content.recommendedFrom)) {
        return depth;
      }
      return walk(content.recommendedFrom, depth + 1);
    };

    for (const content of contents) {
      if (!content.recommendedFrom || !byId.has(content.recommendedFrom)) continue;
      longest = Math.max(longest, walk(content.id, 0));
      seen.clear();
    }

    return longest;
  }
}
export const recommendationService = new RecommendationService();
