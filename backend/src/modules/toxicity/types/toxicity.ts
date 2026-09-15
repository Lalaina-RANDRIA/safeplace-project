export type ToxicityCategory = "INSULT" | "HARASSMENT" | "THREAT" | "HATE" | "SEXUAL_HARASSMENT" | "AGGRESSION" | "BULLYING" | "PROVOCATION" | "OTHER";
export type ToxicityVerdict = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" | "CRITICAL_RISK" | "UNKNOWN";
export type ToxicityAiStatus = "AVAILABLE" | "UNAVAILABLE" | "NOT_CONFIGURED" | "ERROR";
export type ToxicitySignalSource = "PATTERN" | "AI" | "ONNX";

export interface ToxicityModelSignal {
  source: "ONNX";
  label: number;
  nonToxicProbability: number;
  toxicProbability: number;
  confidence: number;
  explanation?: string;
}

export interface ToxicitySignal {
	category: ToxicityCategory;
	score: number;
	confidence: number;
	source: ToxicitySignalSource;
	explanation?: string;
	evidence?: string;
}
export interface ToxicityInput { url: string; title?: string; content: string; }
export interface ToxicityResult {
	url: string;
	score: number;
	verdict: ToxicityVerdict;
	categories: ToxicityCategory[];
	aiAvailable: boolean;
	aiStatus: ToxicityAiStatus;
	modelSignal?: ToxicityModelSignal;
	signals?: ToxicitySignal[];
	explanation: string;
	analyzedAt: string;
}
