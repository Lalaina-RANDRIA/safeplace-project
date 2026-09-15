import type {
  ExtractionErrorMessage,
  ExtractionPayload,
  ExtractionResultForPanelMessage,
  ExtractionResultMessage,
  StartExtractionMessage,
} from "./extraction";
import type { AnalysisDomain } from "./common";
import type { AnalysisResponse } from "./analysis";

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
export interface AnalysisResultMessage { type: "ANALYSIS_RESULT"; payload: AnalysisResponse; debugAnalysisId?: string; }
export interface AnalysisErrorMessage { type: "ANALYSIS_ERROR"; domain?: AnalysisDomain; message: string; errorCode: string; debugAnalysisId?: string; }

export type SafePlaceMessage =
  | StartExtractionMessage
  | ExtractionResultMessage
  | ExtractionResultForPanelMessage
  | ExtractionErrorMessage
  | AnalyzeFakeNewsMessage
  | AnalyzeScamMessage
  | AnalyzeToxicityMessage
  | AnalyzeRabbitHoleMessage
  | AnalysisResultMessage
  | AnalysisErrorMessage;
