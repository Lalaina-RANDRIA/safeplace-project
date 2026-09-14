export type ScamSignalType =
  | "URGENCY"
  | "THREAT"
  | "PRIZE"
  | "IMPERSONATION"
  | "PAYMENT_REQUEST"
  | "PERSONAL_INFORMATION"
  | "CREDENTIAL_REQUEST"
  | "SUSPICIOUS_LINK"
  | "UNEXPECTED_CONTACT"
  | "TOO_GOOD_TO_BE_TRUE"
  | "FAKE_SUPPORT"
  | "OTHER";

export type ScamVerdict =
  | "LOW_RISK"
  | "MEDIUM_RISK"
  | "HIGH_RISK"
  | "CRITICAL_RISK"
  | "UNKNOWN";

export interface ScamSignal {
  type: ScamSignalType;
  score: number;
  confidence: number;
  description: string;
  evidence?: string;
}

export interface ScamAnalysisInput {
  url: string;
  title?: string;
  content: string;
}

export interface ScamUrlAnalysis {
  score: number;
  domain: string;
  signals: ScamSignal[];
}

export interface ScamContentAnalysis {
  score: number;
  signals: ScamSignal[];
}

export interface ScamIdentityAnalysis {
  score: number;
  signals: ScamSignal[];
}

export interface ScamAnalysisResult {
  url: string;
  score: number;
  verdict: ScamVerdict;
  title?: string;
  domain: string;
  urlScore: number;
  contentScore: number;
  identityScore: number;
  reputationScore?: number;
  signals: ScamSignal[];
  explanation: string;
  analyzedAt: string;
}

export type ScamResult = ScamAnalysisResult;
