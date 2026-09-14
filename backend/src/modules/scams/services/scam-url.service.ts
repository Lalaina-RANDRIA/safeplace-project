import {
  getRegistrableDomain,
  parseHttpUrl,
} from "../../../shared/utils/url.util.ts";

import type { ScamSignal, ScamUrlAnalysis } from "../types/scam.ts";

export class InvalidScamUrlError extends Error {
  constructor(message = "URL invalide.") {
    super(message);
    this.name = "InvalidScamUrlError";
  }
}

/**
 * Adresse IPv4 simple.
 *
 * Cette vérification permet d'identifier les URL utilisant
 * directement une adresse IP comme hostname.
 */
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/**
 * Adresse IPv6 entre crochets.
 *
 * Exemple :
 *
 * https://[2001:db8::1]/login
 */
const IPV6_PATTERN = /^\[[0-9a-f:]+\]$/i;

/**
 * Paramètres qui peuvent être utilisés pour transporter
 * une destination, une session, une redirection ou une
 * information d'authentification.
 *
 * Attention :
 * leur simple présence n'est PAS une preuve d'arnaque.
 */
const SUSPICIOUS_PARAMETER_NAMES = new Set([
  "redirect",
  "redirect_uri",
  "redirect_url",
  "return",
  "return_url",
  "returnurl",
  "next",
  "next_url",
  "url",
  "target",
  "destination",
  "dest",
  "continue",
  "callback",
  "login",
  "verify",
  "verification",
  "token",
  "session",
  "auth",
  "auth_token",
]);

/**
 * Paramètres qui indiquent particulièrement souvent
 * une URL transportée à l'intérieur d'une autre URL.
 */
const REDIRECT_PARAMETER_NAMES = new Set([
  "redirect",
  "redirect_uri",
  "redirect_url",
  "return",
  "return_url",
  "returnurl",
  "next",
  "next_url",
  "url",
  "target",
  "destination",
  "dest",
  "continue",
  "callback",
]);

/**
 * Ports couramment utilisés par les navigateurs.
 *
 * Les ports non standards ne sont pas nécessairement
 * malveillants, mais peuvent constituer un signal.
 */
const COMMON_HTTP_PORTS = new Set([80, 443, 8080, 8443]);

/**
 * Termes pouvant indiquer qu'un domaine essaie
 * d'imiter un service ou une marque.
 *
 * Cette liste reste volontairement générique.
 * La vraie comparaison avec les marques sera faite
 * par scam-identity.service.ts.
 */
const SUSPICIOUS_BRAND_TERMS = [
  "secure",
  "security",
  "verify",
  "verification",
  "account",
  "login",
  "signin",
  "support",
  "service",
  "update",
  "authentication",
  "wallet",
];

/**
 * Nombre maximal de sous-domaines considéré comme raisonnable.
 *
 * Exemple :
 *
 * login.example.com
 *
 * est normal.
 *
 * login.verify.account.example.com
 *
 * devient plus suspect.
 */
const MAX_HOSTNAME_LABELS = 4;

/**
 * Longueur à partir de laquelle une URL devient
 * particulièrement longue.
 */
const LONG_URL_LENGTH = 180;

/**
 * Longueur à partir de laquelle le hostname
 * devient particulièrement long.
 */
const LONG_HOSTNAME_LENGTH = 80;

/**
 * Longueur à partir de laquelle le domaine
 * devient particulièrement long.
 */
const LONG_DOMAIN_LENGTH = 40;

/**
 * Crée un signal Scams standardisé.
 */
function createSignal(
  type: ScamSignal["type"],
  description: string,
  evidence: string,
  score: number,
  confidence: number,
): ScamSignal {
  return {
    type,
    score: clamp(score),
    confidence: clamp(confidence),
    description,
    evidence,
  };
}

/**
 * Limite une valeur à l'intervalle [0, 1].
 */
function clamp(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

/**
 * Vérifie si un hostname ressemble à une adresse IPv4.
 */
function isIPv4Hostname(hostname: string): boolean {
  if (!IPV4_PATTERN.test(hostname)) {
    return false;
  }

  const parts = hostname.split(".");

  if (parts.length !== 4) {
    return false;
  }

  for (const part of parts) {
    const value = Number(part);

    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return false;
    }
  }

  return true;
}

/**
 * Vérifie si un hostname est une adresse IPv6.
 */
function isIPv6Hostname(hostname: string): boolean {
  return IPV6_PATTERN.test(hostname);
}

/**
 * Vérifie si le hostname utilise directement une adresse IP.
 */
function isIpHostname(hostname: string): boolean {
  return isIPv4Hostname(hostname) || isIPv6Hostname(hostname);
}

/**
 * Vérifie si une adresse IPv4 appartient à une plage privée.
 *
 * Ces adresses ne constituent généralement pas une destination
 * publique normale.
 */
function isPrivateIpv4(hostname: string): boolean {
  if (!isIPv4Hostname(hostname)) {
    return false;
  }

  const parts = hostname.split(".").map(Number);

  const first = parts[0];

  const second = parts[1];

  if (first === undefined || second === undefined) {
    return false;
  }

  if (first === 10) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  if (first === 127) {
    return true;
  }

  return false;
}

/**
 * Détecte des caractères inhabituels dans l'URL.
 *
 * On conserve volontairement une liste limitée afin de ne pas
 * produire trop de faux positifs.
 */
function containsUnusualUrlCharacters(href: string): boolean {
  return /[<>{}\[\]\\|`^]/.test(href);
}

/**
 * Vérifie si un domaine utilise du punycode.
 */
function usesPunycode(hostname: string): boolean {
  return hostname
    .toLowerCase()
    .split(".")
    .some((label) => label.startsWith("xn--"));
}

/**
 * Détermine les paramètres suspects.
 */
function getSuspiciousParameters(searchParams: URLSearchParams): string[] {
  const suspicious: string[] = [];

  for (const key of searchParams.keys()) {
    const normalizedKey = key.trim().toLowerCase();

    if (SUSPICIOUS_PARAMETER_NAMES.has(normalizedKey)) {
      suspicious.push(key);
    }
  }

  return suspicious;
}

/**
 * Détermine les paramètres pouvant transporter
 * une URL de destination.
 */
function getRedirectParameters(searchParams: URLSearchParams): Array<{
  name: string;
  value: string;
}> {
  const redirects: Array<{
    name: string;
    value: string;
  }> = [];

  for (const [key, value] of searchParams.entries()) {
    const normalizedKey = key.trim().toLowerCase();

    if (!REDIRECT_PARAMETER_NAMES.has(normalizedKey)) {
      continue;
    }

    redirects.push({
      name: key,
      value: value,
    });
  }

  return redirects;
}

/**
 * Vérifie si un paramètre contient lui-même une URL.
 */
function containsEmbeddedUrl(value: string): boolean {
  try {
    const decodedValue = decodeURIComponent(value);

    return /^https?:\/\//i.test(decodedValue) || /^www\./i.test(decodedValue);
  } catch {
    return /^https?:\/\//i.test(value);
  }
}

/**
 * Détecte un encodage imbriqué sans pénaliser l'encodage URL normal.
 */
function containsNestedEncoding(value: string): boolean {
  if (!/%[0-9a-f]{2}/i.test(value)) {
    return false;
  }

  try {
    const decodedValue = decodeURIComponent(value);
    return (
      decodedValue !== value &&
      (/%[0-9a-f]{2}/i.test(decodedValue) || /^https?:\/\//i.test(decodedValue))
    );
  } catch {
    return false;
  }
}

/**
 * Détecte des termes génériques pouvant donner une apparence
 * de connexion, vérification ou support à un domaine.
 *
 * Ce n'est PAS une détection de marque.
 */
function containsSuspiciousDomainTerms(hostname: string): string[] {
  const normalizedHostname = hostname.toLowerCase().replace(/[^a-z0-9.-]/g, "");

  const matches: string[] = [];

  for (const term of SUSPICIOUS_BRAND_TERMS) {
    if (normalizedHostname.includes(term)) {
      matches.push(term);
    }
  }

  return matches;
}

/**
 * Calcule le nombre de labels du hostname.
 */
function getHostnameLabelCount(hostname: string): number {
  return hostname.split(".").filter((label) => label.length > 0).length;
}

/**
 * Calcule le score global d'une liste de signaux URL.
 *
 * Une moyenne pondérée est utilisée pour éviter que
 * plusieurs petits signaux fassent immédiatement saturer
 * le score à 1.
 */
function calculateUrlScore(signals: ScamSignal[]): number {
  if (signals.length === 0) {
    return 0;
  }

  let weightedScore = 0;

  let totalWeight = 0;

  for (const signal of signals) {
    const score = clamp(signal.score);

    const confidence = clamp(signal.confidence);

    weightedScore += score * confidence;

    totalWeight += confidence;
  }

  if (totalWeight === 0) {
    return 0;
  }

  const result = weightedScore / totalWeight;

  return Math.round(clamp(result) * 100) / 100;
}

/**
 * Service chargé d'analyser la structure d'une URL.
 *
 * Important :
 * ce service ne décide jamais à lui seul qu'une page est
 * une arnaque.
 *
 * Il fournit uniquement des signaux et un score URL.
 */
export class ScamUrlService {
  /**
   * Analyse une URL.
   */
  analyze(url: string): ScamUrlAnalysis {
    const parsed = parseHttpUrl(url);

    /**
     * Une URL invalide relève de la validation,
     * pas de la détection Scam.
     */
    if (!parsed) {
      throw new InvalidScamUrlError();
    }

    const signals: ScamSignal[] = [];

    const hostname = parsed.hostname.toLowerCase();

    const domain = getRegistrableDomain(parsed);

    /**
     * ============================================================
     * 1. Identifiants intégrés dans l'URL
     * ============================================================
     */

    if (parsed.username || parsed.password) {
      const evidence = parsed.username || "[username]";

      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "L'URL contient des identifiants intégrés.",
          evidence,
          0.55,
          0.75,
        ),
      );
    }

    /**
     * ============================================================
     * 2. Adresse IP directe
     * ============================================================
     */

    if (isIpHostname(hostname)) {
      const isPrivate = isPrivateIpv4(hostname);

      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",

          isPrivate
            ? "L'URL utilise une adresse IP privée comme destination."
            : "L'URL utilise directement une adresse IP comme hostname.",

          hostname,

          isPrivate ? 0.45 : 0.55,

          0.8,
        ),
      );
    }

    /**
     * ============================================================
     * 3. Punycode
     * ============================================================
     */

    if (usesPunycode(hostname)) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "Le domaine utilise du punycode.",
          hostname,
          0.5,
          0.65,
        ),
      );
    }

    /**
     * ============================================================
     * 4. URL très longue
     * ============================================================
     */

    if (parsed.href.length > LONG_URL_LENGTH) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "L'URL est exceptionnellement longue.",
          parsed.href.slice(0, LONG_URL_LENGTH),
          0.3,
          0.6,
        ),
      );
    }

    /**
     * ============================================================
     * 5. Hostname très long
     * ============================================================
     */

    if (hostname.length > LONG_HOSTNAME_LENGTH) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "Le nom d'hôte est particulièrement long.",
          hostname,
          0.3,
          0.55,
        ),
      );
    }

    /**
     * ============================================================
     * 6. Domaine long
     * ============================================================
     */

    if (domain.length > LONG_DOMAIN_LENGTH) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "Le domaine principal est particulièrement long.",
          domain,
          0.25,
          0.5,
        ),
      );
    }

    /**
     * ============================================================
     * 7. Nombre élevé de sous-domaines
     * ============================================================
     */

    const hostnameLabelCount = getHostnameLabelCount(hostname);

    if (hostnameLabelCount > MAX_HOSTNAME_LABELS) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "Le hostname contient un nombre inhabituellement élevé de sous-domaines.",
          hostname,
          0.35,
          0.6,
        ),
      );
    }

    /**
     * ============================================================
     * 8. Port inhabituel
     * ============================================================
     */

    if (parsed.port) {
      const port = Number(parsed.port);

      if (Number.isInteger(port) && !COMMON_HTTP_PORTS.has(port)) {
        signals.push(
          createSignal(
            "SUSPICIOUS_LINK",
            "L'URL utilise un port HTTP/HTTPS non standard.",
            `Port ${port}`,
            0.25,
            0.5,
          ),
        );
      }
    }

    /**
     * ============================================================
     * 9. Caractères inhabituels
     * ============================================================
     */

    if (containsUnusualUrlCharacters(parsed.href)) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "L'URL contient des caractères inhabituels.",
          parsed.href,
          0.4,
          0.65,
        ),
      );
    }

    /**
     * ============================================================
     * 10. Paramètres suspects
     * ============================================================
     */

    const suspiciousParameters = getSuspiciousParameters(parsed.searchParams);

    if (suspiciousParameters.length > 0) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "Les paramètres de l'URL peuvent transporter une destination, une session ou une information de vérification.",
          suspiciousParameters.join(", "),
          0.3,
          0.55,
        ),
      );
    }

    /**
     * ============================================================
     * 11. Redirection embarquée
     * ============================================================
     */

    const redirectParameters = getRedirectParameters(parsed.searchParams);

    const embeddedRedirects = redirectParameters.filter((parameter) =>
      containsEmbeddedUrl(parameter.value),
    );

    if (embeddedRedirects.length > 0) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "L'URL contient une destination HTTP/HTTPS embarquée dans un paramètre de redirection.",
          embeddedRedirects.map((parameter) => parameter.name).join(", "),
          0.5,
          0.7,
        ),
      );
    }

    /**
     * ============================================================
     * 12. Encodage imbriqué
     * ============================================================
     */

    const nestedEncodedParameters = [...parsed.searchParams.entries()]
      .filter(([, value]) => containsNestedEncoding(value))
      .map(([key]) => key);

    if (nestedEncodedParameters.length > 0) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "Un paramètre contient plusieurs niveaux d'encodage URL.",
          nestedEncodedParameters.join(", "),
          0.25,
          0.5,
        ),
      );
    }

    /**
     * ============================================================
     * 13. Termes génériques dans le domaine
     * ============================================================
     *
     * Ce signal est volontairement faible.
     *
     * Exemple :
     *
     * secure-login.example.com
     *
     * n'est PAS automatiquement une arnaque.
     */
    const suspiciousDomainTerms = containsSuspiciousDomainTerms(hostname);

    if (suspiciousDomainTerms.length > 0) {
      signals.push(
        createSignal(
          "SUSPICIOUS_LINK",
          "Le domaine contient des termes associés à la connexion, à la vérification ou au support.",
          suspiciousDomainTerms.join(", "),
          0.2,
          0.4,
        ),
      );
    }

    /**
     * ============================================================
     * Score final URL
     * ============================================================
     */

    const score = calculateUrlScore(signals);

    return {
      score,
      signals,
      domain,
    };
  }
}

/**
 * Instance partagée du service.
 */
export const scamUrlService = new ScamUrlService();
