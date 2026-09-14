import type { ExtractionPayload } from "./extraction";

export interface PageAnalysisInput {
  url: string;
  domain: string;
  title: string;
  content: string;
  links: ExtractionPayload["links"];
  extractedAt: number;
}

export type AnalysisModule = "fakeNews" | "scams" | "toxicity" | "rabbitHole";

export interface ModuleAnalysisSuccess {
  status: "success";
  data: Record<string, unknown>;
}

export interface ModuleAnalysisFailure {
  status: "error";
  message: string;
  errorCode?: string;
}

export type ModuleAnalysisResult = ModuleAnalysisSuccess | ModuleAnalysisFailure;

export interface AnalysisResponse {
  fakeNews: ModuleAnalysisResult;
  scams: ModuleAnalysisResult;
  toxicity: ModuleAnalysisResult;
  rabbitHole: ModuleAnalysisResult;
}
