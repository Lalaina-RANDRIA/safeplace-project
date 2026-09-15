export type RabbitHoleVerdict = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" | "CRITICAL_RISK" | "UNKNOWN";
export type RabbitHoleModelLabel = "LOW" | "MEDIUM" | "HIGH";
export type RabbitHoleModelSource = "ML" | "HEURISTIC";

export interface RabbitHoleFactors {
  topicRepetitionScore: number;
  recommendationScore: number;
  similarityScore: number;
  escalationScore: number;
  temporalProgressionScore: number;
}

export interface RabbitHoleContent {
  id: string;
  title?: string;
  text: string;
  timestamp?: string;
  recommendedFrom?: string;
}

export interface RabbitHoleFeatures {
  sequenceLength: number;
  clickDepth: number;
  sessionTime: number;
  uniqueVideos: number;
  repetitionScore: number;
  diversityScore: number;
}

export interface RabbitHoleModelPrediction {
  label: RabbitHoleModelLabel;
  probabilities?: {
    LOW?: number;
    MEDIUM?: number;
    HIGH?: number;
  };
}

export interface RabbitHoleModelProvider {
  predict(features: RabbitHoleFeatures): Promise<RabbitHoleModelPrediction>;
}

export interface RabbitHoleInput {
  url: string;
  contents: RabbitHoleContent[];
  sessionTime?: number;
  clickDepth?: number;
}

export interface RabbitHoleResult {
  url: string;
  score: number;
  verdict: RabbitHoleVerdict;
  indicators: string[];
  factors: RabbitHoleFactors;
  modelSource: RabbitHoleModelSource;
  modelConfidence?: number;
  explanation: string;
  analyzedAt: string;
}
