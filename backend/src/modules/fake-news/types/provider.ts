export type ProviderStatus = "AVAILABLE" | "UNAVAILABLE" | "ERROR";

export interface AgenticLimits {
  maxClaims: number;
  maxQueriesPerClaim: number;
  maxSearchResultsPerQuery: number;
  maxSynthesisCalls: number;
  timeoutMs: number;
}

export const DEFAULT_AGENTIC_LIMITS: AgenticLimits = {
  maxClaims: 20,
  maxQueriesPerClaim: 3,
  maxSearchResultsPerQuery: 10,
  maxSynthesisCalls: 20,
  timeoutMs: 10_000,
};
