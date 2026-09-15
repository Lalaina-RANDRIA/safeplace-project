import type { ToxicityCategory, ToxicitySignal } from "../types/toxicity";

interface ToxicityRule {
  category: ToxicityCategory;
  pattern: RegExp;
  score: number;
  confidence: number;
  explanation: string;
}

const rules: ToxicityRule[] = [
  { category: "THREAT", pattern: /\b(?:je vais te faire du mal|je vais te tuer|i will hurt you|i will kill you)\b/i, score: 0.95, confidence: 0.95, explanation: "Menace directe détectée." },
  { category: "INSULT", pattern: /\b(?:tu es|t'es|you are)\s+(?:un|une|an|a)?\s*(?:idiot|imbécile|crétin|stupid|idiotic)\b/i, score: 0.65, confidence: 0.85, explanation: "Insulte adressée directement à une personne." },
  { category: "HARASSMENT", pattern: /\b(?:ferme-la|taisez-vous|dégage|leave me alone|shut up)\b/i, score: 0.6, confidence: 0.8, explanation: "Formulation agressive adressée à une personne." },
  { category: "HATE", pattern: /\b(?:je hais|i hate)\s+(?:ce groupe|ces gens|them|this group)\b/i, score: 0.9, confidence: 0.85, explanation: "Expression de haine ciblée détectée." },
  { category: "BULLYING", pattern: /\b(?:tout le monde se moque de toi|personne ne t'aime|everyone laughs at you|nobody likes you)\b/i, score: 0.75, confidence: 0.8, explanation: "Formulation d'intimidation ou d'isolement." },
  { category: "PROVOCATION", pattern: /\b(?:vas-y,? prouve-le|tu n'oses pas|go on, prove it|you won't dare)\b/i, score: 0.4, confidence: 0.7, explanation: "Provocation explicite détectée." },
  { category: "AGGRESSION", pattern: /\b(?:je vais te frapper|je vais t'attaquer|i will hit you|i will attack you)\b/i, score: 0.85, confidence: 0.9, explanation: "Intention agressive explicite détectée." },
  { category: "SEXUAL_HARASSMENT", pattern: /\b(?:commentaires? sexuels? non désirés|unwanted sexual comments|envoie des photos nues)\b/i, score: 0.85, confidence: 0.8, explanation: "Comportement de harcèlement sexuel explicite détecté." },
];

export class ToxicityPatternService {
  detect(content: string): ToxicitySignal[] {
    const signals: ToxicitySignal[] = [];
    for (const rule of rules) {
      const match = content.match(rule.pattern);
      if (!match) continue;
      signals.push({
        category: rule.category,
        score: rule.score,
        confidence: rule.confidence,
        source: "PATTERN",
        explanation: rule.explanation,
        evidence: match[0],
      });
    }
    return signals;
  }
}

export const toxicityPatternService = new ToxicityPatternService();
