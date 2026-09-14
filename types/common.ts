export interface PageSnapshot {
  url: string;
  title: string;
  content: string;
  capturedAt: number;
}

export type AnalysisDomain = "fake-news" | "scams" | "toxicity" | "rabbit-hole";
