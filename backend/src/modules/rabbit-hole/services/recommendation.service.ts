import type { RabbitHoleContent } from "../types/rabbit-hole";

export class RecommendationService {
  countLinks(contents: RabbitHoleContent[]): number {
    return contents.filter((content) => Boolean(content.recommendedFrom)).length;
  }
}
export const recommendationService = new RecommendationService();
