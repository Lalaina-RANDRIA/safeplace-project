export type RabbitHoleVerdict = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" | "CRITICAL_RISK" | "UNKNOWN";
export interface RabbitHoleFactors {
	topicRepetitionScore: number;
	recommendationScore: number;
	similarityScore: number;
	escalationScore: number;
	temporalProgressionScore: number;
}
export interface RabbitHoleContent { id: string; title?: string; text: string; timestamp?: string; recommendedFrom?: string; }
export interface RabbitHoleInput { url: string; contents: RabbitHoleContent[]; }
export interface RabbitHoleResult {
	url: string;
	score: number;
	verdict: RabbitHoleVerdict;
	indicators: string[];
	factors?: RabbitHoleFactors;
	explanation: string;
	analyzedAt: string;
}
