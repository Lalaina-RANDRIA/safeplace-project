import type { Evidence, SourceReliability } from "../types/evidence";

export type CredibilityLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface SourceCredibility {
  score: number;
  level: CredibilityLevel;
  reasons: string[];
}

export class CredibilityService {
  evaluate(evidence: Evidence): SourceCredibility {
    const reasons: string[] = [];
    let score = 0.5;

    if (evidence.sourceType === "OFFICIAL" || evidence.sourceType === "SCIENTIFIC") {
      score = 0.85;
      reasons.push("Source institutionnelle ou scientifique.");
    } else if (evidence.sourceType === "FACT_CHECK") {
      score = 0.8;
      reasons.push("Source spécialisée en fact-checking.");
    } else if (evidence.sourceType === "SOCIAL_MEDIA" || evidence.sourceType === "BLOG") {
      score = 0.3;
      reasons.push("Source éditorialement moins contrôlée.");
    } else {
      reasons.push("Source non classifiée.");
    }

    if (evidence.url.startsWith("https://")) {
      score = Math.min(1, score + 0.05);
      reasons.push("Connexion HTTPS.");
    }

    const level: CredibilityLevel = score >= 0.75 ? "HIGH" : score >= 0.5 ? "MEDIUM" : score > 0 ? "LOW" : "UNKNOWN";
    return { score: Math.max(0, Math.min(1, score)), level, reasons };
  }

  evaluateAll(evidence: Evidence[]): Evidence[] {
    return evidence.map((item) => {
      const credibility = this.evaluate(item);
      return { ...item, credibilityScore: credibility.score, credibilityLevel: credibility.level, credibilityReasons: credibility.reasons };
    });
  }
}

export const credibilityService = new CredibilityService();
