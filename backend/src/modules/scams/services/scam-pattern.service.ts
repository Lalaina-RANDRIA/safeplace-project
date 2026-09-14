import type { ScamSignal, ScamSignalType } from "../types/scam.ts";

interface PatternRule {
  type: ScamSignalType;
  expressions: RegExp[];
  exclusions?: RegExp[];
  score: number;
  confidence: number;
  description: string;
}

const patterns: PatternRule[] = [
  {
    type: "URGENCY",
    expressions: [
      /\b(?:urgent|immediately|immédiatement|maintenant|now|d'urgence)\b.{0,60}\b(?:agir|act|click|cliquez|appelez|call|envoyez|send|confirmez|confirm|communiquez|provide)\b/i,
      /\b(?:agir|act|click|cliquez|appelez|call|envoyez|send|confirmez|confirm|communiquez|provide)\b.{0,60}\b(?:urgent|immediately|immédiatement|maintenant|now|d'urgence)\b/i,
      /\b(?:compte|account|service).{0,50}\b(?:bloqué|blocked|suspendu|suspended|fermé|closed)\b.{0,50}\b(?:si|if|unless|sans)\b/i,
    ],
    exclusions: [/\b(?:ne|n'|never|do not|don't)\b.{0,40}\b(?:agir|act|click|cliquez|appelez|call|envoyez|send|confirmez|confirm)\b/i],
    score: 0.72,
    confidence: 0.8,
    description: "Le contenu impose une action immédiate.",
  },
  {
    type: "THREAT",
    expressions: [
      /(?:compte|account|service).{0,50}(?:suspendu|suspended|fermé|closed|bloqué|blocked).{0,50}(?:si|if|unless|sans|without)/i,
      /(?:compte|account|service).{0,50}(?:suspendu|suspended|fermé|closed|bloqué|blocked).{0,100}(?:confirmez|communiquez|payez|appelez|confirm|provide|pay|call)/i,
      /(?:vous serez|you will be|will be).{0,40}(?:sanctionné|sanctioned|poursuivi|prosecuted|bloqué|blocked).{0,50}(?:si|if|sans|without)/i,
      /(?:suspendu|suspended|bloqué|blocked|sanction|penalty).{0,50}(?:si|if|avant|before|unless)/i,
    ],
    exclusions: [/\b(?:explique|explains|expliqu[eé]|explaining|prévention|prevention|éviter|avoid|contre|against)\b.{0,80}\b(?:menace|threat|suspend|sanction|phishing)\b/i],
    score: 0.7,
    confidence: 0.76,
    description: "Le contenu utilise une menace pour pousser à agir.",
  },
  {
    type: "PRIZE",
    expressions: [
      /(?:vous avez|tu as|you have|you).{0,40}(?:gagné|remporté|won|received).{0,80}(?:cliquez|click|réclamer|claim|confirmer|confirm)/i,
      /(?:félicitations|congratulations).{0,60}(?:cadeau|gift|lot|prize|récompense|reward).{0,60}(?:cliquez|click|réclamer|claim|confirmer|confirm)/i,
    ],
    exclusions: [/\b(?:explique|explains|faux concours|fake contest|peuvent proposer|can offer)\b/i],
    score: 0.65,
    confidence: 0.72,
    description: "Le contenu promet une récompense conditionnée à une action.",
  },
  {
    type: "PAYMENT_REQUEST",
    expressions: [
      /(?:envoyez|payez|pay|versez|effectuez|send|transfer|make).{0,60}(?:€|ar|euros?|ariary|virement|transfer|bitcoin|paiement|payment|frais|fee)/i,
      /(?:carte bancaire|bank card|coordonnées bancaires|bank details).{0,50}(?:envoyez|communiquez|saisissez|send|share|enter)/i,
    ],
    exclusions: [
      /\b(?:ne|n'|never|do not|don't)\b.{0,50}\b(?:payez|payer|pay|paiement|payment|envoyez|send)\b/i,
      /\b(?:explique|explains|expliquer|article|risques|risks|acceptés|accepted)\b.{0,80}\b(?:paiement|payment|payer|pay|carte bancaire|bank card)\b/i,
    ],
    score: 0.82,
    confidence: 0.86,
    description:
      "Le contenu demande un paiement ou des coordonnées de paiement.",
  },
  {
    type: "PERSONAL_INFORMATION",
    expressions: [
      /(?:communiquez|envoyez|saisissez|confirmez|enter|send|provide|share).{0,60}(?:informations personnelles|personal information|numéro de sécurité|social security|date de naissance|date of birth|numéro de téléphone|phone number)/i,
    ],
    exclusions: [/\b(?:ne|n'|never|do not|don't)\b.{0,50}\b(?:communiquez|envoyez|saisissez|enter|send|provide)\b/i],
    score: 0.68,
    confidence: 0.78,
    description: "Le contenu demande des informations personnelles sensibles.",
  },
  {
    type: "CREDENTIAL_REQUEST",
    expressions: [
      /(?:communiquez|saisissez|confirmez|envoyez|enter|provide|send|confirm).{0,60}(?:mot de passe|password|identifiants|credentials|code otp|otp code|code de connexion|login code|code\b)/i,
    ],
    exclusions: [
      /\b(?:ne|n'|never|do not|don't)\b.{0,50}\b(?:communiquez|saisissez|confirmez|envoyez|enter|provide|send)\b/i,
      /\b(?:explique|explains|recommande|recommends|protéger|protect|important|important)\b.{0,80}\b(?:mot de passe|password|identifiants|credentials)\b/i,
    ],
    score: 0.82,
    confidence: 0.86,
    description: "Le contenu demande des identifiants ou un code de sécurité.",
  },
  {
    type: "SUSPICIOUS_LINK",
    expressions: [
      /(?:cliquez|ouvrez|suivez|click|open|follow|log in).{0,50}(?:ce lien|ici|this link|here|bit\.ly|shorturl|link).{0,50}(?:confirmer|confirm|recevoir|receive|prix|prize|compte|account)?/i,
    ],
    exclusions: [
      /\b(?:explique|explains|peuvent|can|dangereux|dangerous|risque|risk)\b.{0,80}\b(?:liens?|links?)\b/i,
      /\b(?:liens?|links?)\b.{0,80}\b(?:dangereux|dangerous|risque|risk)\b/i,
    ],
    score: 0.58,
    confidence: 0.68,
    description:
      "Le contenu pousse à ouvrir un lien dans un contexte d'action.",
  },
  {
    type: "UNEXPECTED_CONTACT",
    expressions: [
      /(?:nous vous contactons|we contacted you|contact inattendu|unexpected contact|un conseiller vous appelle|an advisor calls).{0,60}(?:confirmez|appelez|envoyez|communiquez|confirm|call|send|provide)/i,
    ],
    score: 0.55,
    confidence: 0.65,
    description:
      "Le contenu associe un contact inattendu à une demande d'action.",
  },
  {
    type: "TOO_GOOD_TO_BE_TRUE",
    expressions: [
      /(?:argent|money|gain|income|revenu).{0,40}(?:facile|easy|garanti|guaranteed|immédiat|immediate)/i,
      /(?:gratuit|free|sans aucun risque|no risk).{0,40}(?:récompense|reward|gain|profit|revenu|income)/i,
    ],
    exclusions: [/\b(?:explique|explains|critique|criticizes|dangers?|dangers|risques?|risks?)\b.{0,80}\b(?:argent|money|profit|revenu|income|gain)\b/i],
    score: 0.62,
    confidence: 0.7,
    description: "Le contenu présente une promesse financière irréaliste.",
  },
  {
    type: "FAKE_SUPPORT",
    expressions: [
      /(?:(?:notre|our)\s+)?(?:support technique|technical support|support|service client|customer service|assistance|help desk).{0,60}(?:appelez|installez|communiquez|code|call|install|provide|password)/i,
      /(?:appelez|installez|communiquez|call|install|provide).{0,60}(?:(?:notre|our)\s+)?(?:support technique|technical support|support|service client|customer service|assistance|help desk).{0,60}(?:code|mot de passe|password|logiciel|software)/i,
    ],
    exclusions: [
      /\b(?:explique|explains|éviter|avoid|prévention|prevention)\b.{0,80}\b(?:faux supports?|fake support)\b/i,
      /\b(?:faux supports?|fake support)\b.{0,80}\b(?:explique|explains|éviter|avoid|prévention|prevention)\b/i,
    ],
    score: 0.68,
    confidence: 0.74,
    description: "Un prétendu support demande une action sensible.",
  },
  {
    type: "IMPERSONATION",
    expressions: [
      /(?:microsoft|paypal|google|banque|bank).{0,70}(?:support|service client|customer service|mot de passe|password|code|paiement|payment|cliquez|click)/i,
    ],
    exclusions: [
      /\b(?:publie|publishes|alerte|alert|campagnes?|campaigns?|phishing|explique|explains|prévention|prevention|contre|against)\b/i,
    ],
    score: 0.7,
    confidence: 0.7,
    description: "Une marque ou institution est associée à une demande sensible.",
  },
];

export class ScamPatternService {
  detect(content: string): ScamSignal[] {
    return patterns.flatMap((rule) => {
      if (rule.exclusions?.some((exclusion) => exclusion.test(content))) {
        return [];
      }

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
