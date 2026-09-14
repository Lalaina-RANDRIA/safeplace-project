import type { ScamIdentityAnalysis, ScamSignal } from "../types/scam.ts";

/**
 * Informations connues concernant une marque ou une organisation.
 */
interface KnownBrand {
  /**
   * Domaines officiellement associés à la marque.
   */
  officialDomains: string[];

  /**
   * Alias pouvant désigner la marque dans le contenu.
   */
  aliases: string[];
}

/**
 * Base minimale de marques connues.
 *
 * Cette liste doit rester petite, explicite et facilement
 * extensible.
 *
 * IMPORTANT :
 * la simple présence d'une marque dans une page
 * n'est jamais considérée comme une preuve d'usurpation.
 */
const KNOWN_BRANDS: Record<string, KnownBrand> = {
  paypal: {
    officialDomains: ["paypal.com"],

    aliases: ["paypal", "paypal support", "paypal account"],
  },

  microsoft: {
    officialDomains: ["microsoft.com", "live.com"],

    aliases: [
      "microsoft",
      "microsoft support",
      "microsoft account",
      "microsoft security",
    ],
  },

  google: {
    officialDomains: ["google.com"],

    aliases: ["google", "google support", "google account", "google security"],
  },

  banque: {
    officialDomains: [],

    aliases: [
      "banque",
      "bank",
      "service bancaire",
      "service bancaire officiel",
    ],
  },
};

/**
 * Actions pouvant indiquer une demande sensible.
 *
 * Elles sont utilisées uniquement comme contexte.
 */
const SENSITIVE_ACTION_PATTERNS: RegExp[] = [
  /\b(?:communiquez|envoyez|saisissez|entrez|confirmez|fournissez|partagez|transmettez)\b.{0,60}\b(?:mot de passe|password|identifiants?|login|code otp|otp|code de connexion|code de securite)\b/i,

  /\b(?:mot de passe|password|identifiants?|login|code otp|otp|code de connexion|code de securite)\b.{0,60}\b(?:communiquez|envoyez|saisissez|entrez|confirmez|fournissez|partagez|transmettez)\b/i,

  /\b(?:verifiez|verify|confirm|confirmez)\b.{0,60}\b(?:compte|account|identite|identity)\b.{0,60}\b(?:mot de passe|password|code|otp)\b/i,
];

/**
 * Formulations montrant qu'une page revendique
 * explicitement l'identité d'une organisation.
 */
const IDENTITY_CLAIM_PATTERNS: RegExp[] = [
  /\b(?:nous sommes|nous representons|nous faisons partie de|we are|we represent|official support|support officiel|compte officiel|official account)\b.{0,60}\b(?:paypal|microsoft|google|banque|bank)\b/i,

  /\b(?:paypal|microsoft|google|banque|bank)\b.{0,60}\b(?:support officiel|official support|service client|support|assistance|equipe|team)\b/i,

  /\b(?:service client|support|assistance|equipe|team)\b.{0,60}\b(?:paypal|microsoft|google|banque|bank)\b/i,
];

/**
 * Formulations indiquant généralement une tentative
 * de récupération ou de vérification d'un compte.
 */
const ACCOUNT_ACTION_PATTERNS: RegExp[] = [
  /\b(?:verifiez|verify|confirmez|confirm|validez|validate|securisez|secure)\b.{0,60}\b(?:votre compte|your account|votre identite|your identity)\b/i,

  /\b(?:votre compte|your account)\b.{0,60}\b(?:sera|will be|va etre|is going to be)\b.{0,60}\b(?:bloque|suspendu|locked|suspended|closed)\b/i,
];

/**
 * Normalise un texte.
 */
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalise un hostname.
 */
function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

/**
 * Récupère le hostname d'une URL HTTP/HTTPS.
 *
 * Une URL invalide n'est pas transformée en signal Scam.
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
 * Détermine si un hostname appartient exactement
 * à un domaine officiel ou à l'un de ses sous-domaines.
 *
 * Exemples acceptés pour microsoft.com :
 *
 * microsoft.com
 * login.microsoft.com
 *
 * Exemple refusé :
 *
 * microsoft.com.example.org
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
 * Recherche un alias de marque dans le contenu.
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
 * Vérifie la présence d'une demande sensible.
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
 * Vérifie si la page revendique explicitement
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
 * Vérifie si le contenu contient une action
 * de vérification/récupération de compte.
 */
function containsAccountAction(normalizedContent: string): boolean {
  for (const pattern of ACCOUNT_ACTION_PATTERNS) {
    if (pattern.test(normalizedContent)) {
      return true;
    }
  }

  return false;
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
  reason: string,
): ScamSignal {
  return {
    type: "IMPERSONATION",

    score,

    confidence,

    description:
      `La page semble revendiquer l'identité de ${brandName}, ` +
      `mais le domaine "${hostname}" ne correspond pas à un domaine officiel connu. ` +
      reason,

    evidence,
  };
}

/**
 * Analyse du risque d'identité.
 *
 * Principe :
 *
 * marque seule
 * → aucun signal
 *
 * marque + revendication d'identité
 * → signal modéré
 *
 * marque + revendication + action sensible
 * → signal plus fort
 *
 * marque + domaine officiel
 * → aucun signal d'usurpation
 */
export class ScamIdentityService {
  analyze(content: string, url: string): ScamIdentityAnalysis {
    const normalizedContent = normalizeText(content);

    /**
     * Aucun contenu à analyser.
     */
    if (normalizedContent.length === 0) {
      return {
        score: 0,
        signals: [],
      };
    }

    /**
     * Extraction du hostname.
     */
    const hostname = getHostnameFromUrl(url);

    /**
     * URL non analysable :
     * aucune conclusion d'usurpation.
     */
    if (!hostname) {
      return {
        score: 0,
        signals: [],
      };
    }

    const signals: ScamSignal[] = [];

    /**
     * Détection du contexte global.
     *
     * Ces valeurs sont calculées une seule fois.
     */
    const sensitiveAction = containsSensitiveAction(normalizedContent);

    const identityClaim = containsIdentityClaim(normalizedContent);

    const accountAction = containsAccountAction(normalizedContent);

    /**
     * Analyse des marques connues.
     */
    for (const [brandName, brand] of Object.entries(KNOWN_BRANDS)) {
      const alias = findBrandAlias(normalizedContent, brand);

      /**
       * Pas de mention de cette marque.
       */
      if (!alias) {
        continue;
      }

      /**
       * Domaine officiel :
       * la mention de la marque est cohérente
       * avec le domaine.
       */
      if (isOfficialDomain(hostname, brand.officialDomains)) {
        continue;
      }

      /**
       * Une marque dans un article informatif
       * ne suffit pas à déclencher une usurpation.
       */
      if (!identityClaim && !sensitiveAction && !accountAction) {
        continue;
      }

      /**
       * Score de base.
       *
       * La simple discordance marque/domaine
       * ne donne qu'un signal modéré.
       */
      let score = 0.45;

      let confidence = 0.55;

      /**
       * Revendication explicite d'identité.
       */
      if (identityClaim) {
        score += 0.15;

        confidence += 0.1;
      }

      /**
       * Demande d'informations sensibles.
       */
      if (sensitiveAction) {
        score += 0.15;

        confidence += 0.1;
      }

      /**
       * Action de récupération/vérification
       * d'un compte.
       */
      if (accountAction) {
        score += 0.1;

        confidence += 0.05;
      }

      /**
       * Limitation des bornes.
       */
      score = Math.min(1, score);

      confidence = Math.min(1, confidence);

      const reasons: string[] = [];

      if (identityClaim) {
        reasons.push("Une revendication explicite d'identité a été détectée.");
      }

      if (sensitiveAction) {
        reasons.push(
          "Une demande d'information ou d'action sensible a été détectée.",
        );
      }

      if (accountAction) {
        reasons.push(
          "Une action de vérification ou de récupération de compte a été détectée.",
        );
      }

      const signal = createImpersonationSignal(
        brandName,
        hostname,
        alias,
        score,
        confidence,
        reasons.join(" "),
      );

      signals.push(signal);
    }

    /**
     * Aucun signal d'usurpation.
     */
    if (signals.length === 0) {
      return {
        score: 0,
        signals: [],
      };
    }

    /**
     * Une page peut mentionner plusieurs marques.
     *
     * On utilise le signal le plus fort au lieu
     * d'additionner les marques.
     */
    const score = this.calculateScore(signals);

    return {
      score,
      signals,
    };
  }

  /**
   * Retourne le meilleur score d'identité.
   *
   * On prend score × confiance afin d'éviter
   * qu'un signal peu fiable domine le résultat.
   */
  private calculateScore(signals: ScamSignal[]): number {
    let bestScore = 0;

    for (const signal of signals) {
      const effectiveScore = signal.score * signal.confidence;

      if (effectiveScore > bestScore) {
        bestScore = effectiveScore;
      }
    }

    return Math.round(Math.min(1, bestScore) * 100) / 100;
  }
}

/**
 * Instance du service.
 */
export const scamIdentityService = new ScamIdentityService();
