import type { ScamIdentityAnalysis, ScamSignal } from "../types/scam.ts";

/**
 * Informations connues pour une marque.
 *
 * officialDomains :
 * domaines officiellement associés à la marque.
 *
 * aliases :
 * variantes textuelles pouvant représenter la marque.
 */
interface KnownBrand {
  officialDomains: string[];

  aliases: string[];
}

/**
 * Base minimale de marques connues.
 *
 * Cette liste doit rester limitée et facilement extensible.
 *
 * IMPORTANT :
 * la présence d'une marque dans le texte ne signifie
 * pas automatiquement qu'il s'agit d'une usurpation.
 */
const KNOWN_BRANDS: Record<string, KnownBrand> = {
  paypal: {
    officialDomains: ["paypal.com"],

    aliases: ["paypal"],
  },

  microsoft: {
    officialDomains: ["microsoft.com", "live.com"],

    aliases: ["microsoft", "microsoft support", "microsoft account"],
  },

  google: {
    officialDomains: ["google.com"],

    aliases: ["google", "google support", "google account"],
  },

  banque: {
    officialDomains: [],

    aliases: ["banque", "bank", "service bancaire"],
  },
};

/**
 * Termes indiquant généralement une demande
 * d'informations ou d'actions sensibles.
 *
 * Le service Identity les utilise uniquement comme
 * facteur contextuel.
 */
const SENSITIVE_ACTION_PATTERNS: RegExp[] = [
  /\b(?:communiquez|envoyez|saisissez|entrez|confirmez|fournissez|partagez)\b.{0,60}\b(?:mot de passe|password|identifiants?|login|code otp|otp|code de connexion)\b/i,

  /\b(?:mot de passe|password|identifiants?|login|code otp|otp|code de connexion)\b.{0,60}\b(?:communiquez|envoyez|saisissez|entrez|confirmez|fournissez|partagez)\b/i,

  /\b(?:vérifiez|verify|confirm|confirmez)\b.{0,60}\b(?:compte|account|identité|identity)\b.{0,60}\b(?:mot de passe|password|code|otp)\b/i,
];

/**
 * Termes indiquant une revendication d'identité
 * plus forte qu'une simple mention informative.
 */
const IDENTITY_CLAIM_PATTERNS: RegExp[] = [
  /\b(?:service client|support|assistance|équipe)\b.{0,60}\b(?:paypal|microsoft|google|banque|bank)\b/i,

  /\b(?:paypal|microsoft|google|banque|bank)\b.{0,60}\b(?:service client|support|assistance|équipe)\b/i,

  /\b(?:nous sommes|nous représentons|support officiel|official support|official account)\b.{0,60}\b(?:paypal|microsoft|google|banque|bank)\b/i,

  /\b(?:votre compte|your account)\b.{0,60}\b(?:paypal|microsoft|google|banque|bank)\b/i,
];

/**
 * Normalise un texte avant comparaison.
 */
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalise un hostname.
 */
function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLocaleLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

/**
 * Vérifie si un hostname appartient à un domaine officiel.
 *
 * Exemple :
 *
 * paypal.com
 * login.paypal.com
 *
 * sont acceptés pour :
 *
 * paypal.com
 */
function isOfficialDomain(
  hostname: string,
  officialDomains: string[],
): boolean {
  const normalizedHostname = normalizeHostname(hostname);

  for (const domain of officialDomains) {
    const normalizedDomain = normalizeHostname(domain);

    if (normalizedHostname === normalizedDomain) {
      return true;
    }

    if (normalizedHostname.endsWith(`.${normalizedDomain}`)) {
      return true;
    }
  }

  return false;
}

/**
 * Retourne le premier alias correspondant
 * au contenu.
 */
function findBrandAlias(
  normalizedContent: string,
  brand: KnownBrand,
): string | undefined {
  for (const alias of brand.aliases) {
    const normalizedAlias = normalizeText(alias);

    if (normalizedContent.includes(normalizedAlias)) {
      return normalizedAlias;
    }
  }

  return undefined;
}

/**
 * Vérifie si une demande sensible existe
 * dans le contenu.
 */
function containsSensitiveAction(normalizedContent: string): boolean {
  for (const pattern of SENSITIVE_ACTION_PATTERNS) {
    if (pattern.test(normalizedContent)) {
      return true;
    }
  }

  return false;
}

/**
 * Vérifie si le contenu revendique explicitement
 * une identité ou un rôle de support.
 */
function containsIdentityClaim(normalizedContent: string): boolean {
  for (const pattern of IDENTITY_CLAIM_PATTERNS) {
    if (pattern.test(normalizedContent)) {
      return true;
    }
  }

  return false;
}

/**
 * Vérifie si le hostname semble être un sous-domaine
 * ou un domaine officiel reconnu.
 */
function getHostnameFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }

    return normalizeHostname(parsedUrl.hostname);
  } catch {
    return null;
  }
}

/**
 * Génère un signal d'usurpation.
 */
function createImpersonationSignal(
  brandName: string,
  hostname: string,
  evidence: string,
  score: number,
  confidence: number,
): ScamSignal {
  return {
    type: "IMPERSONATION",

    score,

    confidence,

    description:
      `Le contenu semble revendiquer l'identité de ${brandName}, ` +
      `mais le domaine "${hostname}" ne correspond pas à un domaine officiel connu.`,

    evidence,
  };
}

/**
 * Service responsable de l'analyse d'identité.
 *
 * Son rôle est de rechercher une éventuelle incohérence
 * entre :
 *
 * - l'identité revendiquée dans le contenu ;
 * - le domaine réellement utilisé.
 *
 * Il ne décide jamais seul qu'une page est une arnaque.
 */
export class ScamIdentityService {
  analyze(content: string, url: string): ScamIdentityAnalysis {
    const normalizedContent = normalizeText(content);

    /**
     * Contenu vide :
     * aucune identité ne peut être analysée.
     */
    if (normalizedContent.length === 0) {
      return {
        score: 0,
        signals: [],
      };
    }

    /**
     * Récupération du hostname.
     */
    const hostname = getHostnameFromUrl(url);

    /**
     * Si l'URL n'est pas analysable ici,
     * on ne transforme pas l'erreur en signal Scam.
     */
    if (!hostname) {
      return {
        score: 0,
        signals: [],
      };
    }

    const signals: ScamSignal[] = [];

    /**
     * Analyse de chaque marque connue.
     */
    for (const [brandName, brand] of Object.entries(KNOWN_BRANDS)) {
      const alias = findBrandAlias(normalizedContent, brand);

      /**
       * La marque n'est pas mentionnée.
       */
      if (!alias) {
        continue;
      }

      /**
       * La marque possède un domaine officiel
       * et le domaine actuel correspond :
       *
       * => aucune usurpation.
       */
      const official = isOfficialDomain(hostname, brand.officialDomains);

      if (official) {
        continue;
      }

      /**
       * Vérifie le contexte.
       *
       * Une simple mention d'une marque dans
       * un article ne doit pas déclencher
       * un signal d'usurpation.
       */
      const sensitiveAction = containsSensitiveAction(normalizedContent);

      const identityClaim = containsIdentityClaim(normalizedContent);

      /**
       * Nous voulons une convergence de signaux.
       *
       * Marque seule :
       * aucun signal.
       *
       * Marque + revendication :
       * risque modéré.
       *
       * Marque + revendication + action sensible :
       * risque plus élevé.
       */
      if (!identityClaim && !sensitiveAction) {
        continue;
      }

      let score = 0.55;

      let confidence = 0.6;

      if (identityClaim) {
        score += 0.1;

        confidence += 0.05;
      }

      if (sensitiveAction) {
        score += 0.1;

        confidence += 0.1;
      }

      /**
       * Protection des bornes.
       */
      score = Math.min(1, score);

      confidence = Math.min(1, confidence);

      const signal = createImpersonationSignal(
        brandName,
        hostname,
        alias,
        score,
        confidence,
      );

      signals.push(signal);
    }

    /**
     * Si aucune incohérence d'identité n'a été détectée.
     */
    if (signals.length === 0) {
      return {
        score: 0,
        signals: [],
      };
    }

    /**
     * Plusieurs marques peuvent éventuellement
     * être détectées.
     *
     * Pour éviter un score supérieur à 1,
     * on utilise le meilleur signal plutôt
     * qu'une addition brute.
     */
    const score = this.calculateScore(signals);

    return {
      score,
      signals,
    };
  }

  /**
   * Calcule le score d'identité.
   *
   * On conserve le signal le plus fort
   * afin d'éviter de faire exploser le score
   * lorsqu'une page mentionne plusieurs marques.
   */
  private calculateScore(signals: ScamSignal[]): number {
    let bestScore = 0;

    for (const signal of signals) {
      const score = signal.score * signal.confidence;

      if (score > bestScore) {
        bestScore = score;
      }
    }

    return Math.round(Math.min(1, bestScore) * 100) / 100;
  }
}

/**
 * Instance du service.
 */
export const scamIdentityService = new ScamIdentityService();
