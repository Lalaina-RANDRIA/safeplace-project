export interface PageInput {
  url: string;
  title?: string;
  content: string;
}

export interface ScoreRange {
  /** Score normalisé entre 0 et 1. */
  score: number;
  reason?: string;
}

export interface AnalysisTimestamp {
  analyzedAt: string;
}
