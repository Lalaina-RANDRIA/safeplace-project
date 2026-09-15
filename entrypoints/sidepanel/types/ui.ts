export type UIRiskStatus =
  | "safe"
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unknown"
  | "pending"
  | "partial";

export type UIModuleStatus =
  | UIRiskStatus
  | "insufficient_context"
  | "not_available"
  | "error"
  | "analyzing";

export interface UIPageContext {
  title: string;
  url: string;
  domain: string;
  extractionMethod?: string;
  extractedAt: number;
}

export interface UIGlobalRisk {
  status: UIRiskStatus;
  score?: number;
  label: string;
  explanation: string;
}

export interface UISummary {
  title: string;
  message: string;
}

export type UIContextStatus =
  | "sufficient"
  | "insufficient"
  | "partial"
  | "unknown";

export interface UIContextState {
  status: UIContextStatus;
  label: string;
}

export type UIModuleId = "fake-news" | "scams" | "toxicity" | "rabbit-hole";

export interface UIModuleDetails {
  raw?: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: string;
}

export interface UIModuleResult {
  id: UIModuleId;
  label: string;
  status: UIModuleStatus;
  score?: number;
  explanation: string;
  details?: UIModuleDetails;
}

export interface UIExtractedContent {
  text: string;
  links: Array<{ href: string; text: string }>;
  characterCount: number;
}

export interface UIAnalysisDetails {
  modules: UIModuleResult[];
}

export interface UIAnalysisResult {
  page: UIPageContext;
  globalRisk: UIGlobalRisk;
  summary: UISummary;
  modules: UIModuleResult[];
  context: UIContextState;
  details: UIAnalysisDetails;
  extractedContent: UIExtractedContent;
  analysisStatus: "pending" | "complete" | "partial";
}
