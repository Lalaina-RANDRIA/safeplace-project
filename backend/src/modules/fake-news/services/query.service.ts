import type { Claim } from "../types/analysis";

export interface GeneratedQuery {
  text: string;
  kind: "PRIMARY" | "FACT_CHECK";
}

export class QueryService {
  generate(claim: Claim): GeneratedQuery[] {
    const text = claim.text.trim();
    if (!text) return [];

    const queries: GeneratedQuery[] = [{ text, kind: "PRIMARY" }];
    const factCheckTerms = /fact[- ]?check|vérif|vrai|faux|claim|preuve/i.test(text)
      ? []
      : [{ text: `${text} fact check`, kind: "FACT_CHECK" as const }];

    return [...queries, ...factCheckTerms].slice(0, 3);
  }
}

export const queryService = new QueryService();
