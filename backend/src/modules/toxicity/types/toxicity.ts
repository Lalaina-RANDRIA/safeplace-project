export type ToxicityCategory = "INSULT" | "HARASSMENT" | "THREAT" | "HATE" | "SEXUAL_HARASSMENT" | "AGGRESSION" | "BULLYING" | "PROVOCATION" | "OTHER";
export type ToxicityVerdict = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" | "CRITICAL_RISK" | "UNKNOWN";
export type ToxicityAiStatus = "AVAILABLE" | "UNAVAILABLE" | "NOT_CONFIGURED" | "ERROR";
export interface ToxicityInput { url: string; title?: string; content: string; }
export interface ToxicityResult {
	url: string;
	score: number;
	verdict: ToxicityVerdict;
	categories: ToxicityCategory[];
	aiAvailable: boolean;
	aiStatus?: ToxicityAiStatus;
	explanation: string;
	analyzedAt: string;
}
