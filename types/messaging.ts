import type { ExtractionPayload } from "./extraction";
import type { AnalysisDomain } from "./common";

export interface AnalyzePayload {
  url: string;
  title: string;
  content: string;
}

export interface AnalyzeFakeNewsMessage { type: "ANALYZE_FAKE_NEWS"; payload: AnalyzePayload; }
export interface AnalyzeScamMessage { type: "ANALYZE_SCAM"; payload: AnalyzePayload; }
export interface AnalyzeToxicityMessage { type: "ANALYZE_TOXICITY"; payload: AnalyzePayload; }
export interface AnalyzeRabbitHolePayload { url: string; contents: Array<{ id: string; title?: string; text: string; timestamp?: string; recommendedFrom?: string; }>; }
export interface AnalyzeRabbitHoleMessage { type: "ANALYZE_RABBIT_HOLE"; payload: AnalyzeRabbitHolePayload; }
export interface AnalysisResultMessage { type: "ANALYSIS_RESULT"; domain: AnalysisDomain; payload: Record<string, unknown>; }
export interface AnalysisErrorMessage { type: "ANALYSIS_ERROR"; domain?: AnalysisDomain; message: string; errorCode: string; }

export type SafePlaceMessage =
  | { type: "START_EXTRACTION" }
  | { type: "EXTRACTION_RESULT"; payload: ExtractionPayload }
  | { type: "EXTRACTION_RESULT_FOR_PANEL"; payload: ExtractionPayload }
  | AnalyzeFakeNewsMessage
  | AnalyzeScamMessage
  | AnalyzeToxicityMessage
  | AnalyzeRabbitHoleMessage
  | AnalysisResultMessage
  | AnalysisErrorMessage;
