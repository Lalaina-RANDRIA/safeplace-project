import type { ScamSignal, ScamSignalType } from "../types/scam.ts";

interface PatternRule {
  type: ScamSignalType;
  expressions: RegExp[];
  score: number;
  confidence: number;
  description: string;
}

const patterns: PatternRule[] = [
  {
    type: "URGENCY",
    expressions: [
      /\b(?:urgent|immediately|immédiatement|maintenant|d'urgence)\b.{0,60}\b(?:agir|cliquez|appelez|envoyez|confirmez)\b/i,
      /\b(?:agir|cliquez|appelez|envoyez|confirmez)\b.{0,60}\b(?:urgent|immediately|immédiatement|maintenant|d'urgence)\b/i,
    ],
    score: 0.72,
    confidence: 0.8,
    description: "Le contenu impose une action immédiate.",
  },
  {
    type: "THREAT",
    expressions: [
      /(?:compte|service).{0,50}(?:suspendu|fermé|bloqué)/i,
      /(?:poursuite|sanction|menace).{0,50}(?:si|avant|sans)/i,
    ],
    score: 0.7,
    confidence: 0.76,
    description: "Le contenu utilise une menace pour pousser à agir.",
  },
  {
    type: "PRIZE",
    expressions: [
      /(?:vous avez|tu as).{0,40}(?:gagné|remporté)/i,
      /(?:lot|récompense|prix).{0,50}(?:réclamer|recevoir|confirmer)/i,
    ],
    score: 0.65,
    confidence: 0.72,
    description: "Le contenu promet une récompense conditionnée à une action.",
  },
  {
    type: "PAYMENT_REQUEST",
    expressions: [
      /(?:envoyez|payez|versez|effectuez).{0,50}(?:€|ar|euros?|virement|bitcoin|paiement)/i,
      /(?:carte bancaire|coordonnées bancaires).{0,50}(?:envoyez|communiquez|saisissez)/i,
    ],
    score: 0.82,
    confidence: 0.86,
    description:
      "Le contenu demande un paiement ou des coordonnées de paiement.",
  },
  {
    type: "PERSONAL_INFORMATION",
    expressions: [
      /(?:communiquez|envoyez|saisissez).{0,50}(?:informations personnelles|numéro de sécurité|date de naissance)/i,
    ],
    score: 0.68,
    confidence: 0.78,
    description: "Le contenu demande des informations personnelles sensibles.",
  },
  {
    type: "CREDENTIAL_REQUEST",
    expressions: [
      /(?:communiquez|saisissez|confirmez|envoyez).{0,50}(?:mot de passe|identifiants|code otp|code de connexion|code\b)/i,
    ],
    score: 0.82,
    confidence: 0.86,
    description: "Le contenu demande des identifiants ou un code de sécurité.",
  },
  {
    type: "SUSPICIOUS_LINK",
    expressions: [
      /(?:cliquez|ouvrez|suivez).{0,40}(?:ce lien|ici|bit\.ly|shorturl)/i,
    ],
    score: 0.58,
    confidence: 0.68,
    description:
      "Le contenu pousse à ouvrir un lien dans un contexte d'action.",
  },
  {
    type: "UNEXPECTED_CONTACT",
    expressions: [
      /(?:nous vous contactons|contact inattendu).{0,60}(?:confirmez|appelez|envoyez|communiquez)/i,
    ],
    score: 0.55,
    confidence: 0.65,
    description:
      "Le contenu associe un contact inattendu à une demande d'action.",
  },
  {
    type: "TOO_GOOD_TO_BE_TRUE",
    expressions: [
      /(?:argent|gain|revenu).{0,40}(?:facile|garanti|immédiat)/i,
      /(?:gratuit|sans aucun risque).{0,40}(?:récompense|gain|profit)/i,
    ],
    score: 0.62,
    confidence: 0.7,
    description: "Le contenu présente une promesse financière irréaliste.",
  },
  {
    type: "FAKE_SUPPORT",
    expressions: [
      /(?:support technique|service client|assistance).{0,60}(?:appelez|installez|communiquez|code)/i,
    ],
    score: 0.68,
    confidence: 0.74,
    description: "Un prétendu support demande une action sensible.",
  },
];

export class ScamPatternService {
  detect(content: string): ScamSignal[] {
    return patterns.flatMap((rule) => {
      const match = rule.expressions.find((expression) =>
        expression.test(content),
      );
      if (!match) return [];

      const evidence = content.match(match)?.[0];
      return [
        {
          type: rule.type,
          score: rule.score,
          confidence: rule.confidence,
          description: rule.description,
          evidence,
        },
      ];
    });
  }
}
export const scamPatternService = new ScamPatternService();
