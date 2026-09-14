import { getRegistrableDomain, parseHttpUrl } from "../../../shared/utils/url.util.ts";
import type { ScamSignal, ScamUrlAnalysis } from "../types/scam.ts";

const IP_HOSTNAME = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const SUSPICIOUS_PARAMETERS = /(?:redirect|return|next|url|login|verify|token|session)/i;

function createSignal(description: string, evidence: string, score: number): ScamSignal {
  return {
    type: "SUSPICIOUS_LINK",
    score,
    confidence: 0.7,
    description,
    evidence,
  };
}

export class ScamUrlService {
  analyze(url: string): ScamUrlAnalysis {
    const parsed = parseHttpUrl(url);
    if (!parsed) return { score: 0, signals: [], domain: "" };

    const signals: ScamSignal[] = [];
    const hostname = parsed.hostname;
    const domain = getRegistrableDomain(parsed);

    if (parsed.username || parsed.password) {
      signals.push(createSignal("L'URL contient des identifiants intégrés.", `${parsed.username}@`, 0.55));
    }
    if (IP_HOSTNAME.test(hostname)) {
      signals.push(createSignal("L'URL utilise directement une adresse IP.", hostname, 0.55));
    }
    if (hostname.includes("xn--")) {
      signals.push(createSignal("Le domaine utilise du punycode.", hostname, 0.5));
    }
    if (parsed.href.length > 180) {
      signals.push(createSignal("L'URL est exceptionnellement longue.", parsed.href.slice(0, 180), 0.3));
    }
    if (hostname.split(".").length > 4) {
      signals.push(createSignal("Le hostname contient beaucoup de sous-domaines.", hostname, 0.35));
    }
    if (/[<>{}\[\]\\]/.test(parsed.href)) {
      signals.push(createSignal("L'URL contient des caractères inhabituels.", parsed.href, 0.4));
    }
    if ([...parsed.searchParams.keys()].some((key) => SUSPICIOUS_PARAMETERS.test(key))) {
      signals.push(createSignal("Les paramètres de l'URL peuvent servir à rediriger ou demander une session.", parsed.search, 0.35));
    }

    const score = Math.min(1, signals.reduce((total, signal) => total + signal.score * signal.confidence, 0));
    return { score, signals, domain };
  }
}
export const scamUrlService = new ScamUrlService();
