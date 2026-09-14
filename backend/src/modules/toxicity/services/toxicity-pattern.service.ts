import type { ToxicityCategory } from "../types/toxicity";

const patterns: Array<[ToxicityCategory, RegExp[]]> = [
  ["THREAT", [/je vais te tuer/i, /je te trouverai/i, /menace/i]],
  ["INSULT", [/\bidiot\b/i, /\bimbécile\b/i, /\bcrétin\b/i]],
  ["HARASSMENT", [/ferme-la/i, /taisez-vous/i, /dégage/i]],
  ["HATE", [/\bhaine\b/i, /\braciale?\b/i, /\bethni/i]],
  ["BULLYING", [/tout le monde se moque/i, /personne ne t'aime/i]],
  ["PROVOCATION", [/vas-y, prouve/i, /tu n'oses pas/i]],
];

export class ToxicityPatternService {
  detect(content: string): ToxicityCategory[] {
    return patterns.filter(([, expressions]) => expressions.some((expression) => expression.test(content))).map(([category]) => category);
  }
}
export const toxicityPatternService = new ToxicityPatternService();
