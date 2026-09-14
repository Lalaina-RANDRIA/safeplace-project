import type { ScamIdentityAnalysis, ScamSignal } from "../types/scam.ts";

const KNOWN_BRANDS: Record<string, string[]> = {
  paypal: ["paypal.com"],
  microsoft: ["microsoft.com", "live.com"],
  google: ["google.com"],
  banque: [],
};

export class ScamIdentityService {
  analyze(content: string, url: string): ScamIdentityAnalysis {
    const normalized = content.toLocaleLowerCase();
    const hostname = new URL(url).hostname.toLocaleLowerCase();
    const brand = Object.keys(KNOWN_BRANDS).find((candidate) => normalized.includes(candidate));
    if (!brand) return { score: 0, signals: [] };

    const officialDomains = KNOWN_BRANDS[brand] ?? [];
    const isOfficialDomain = officialDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
    const asksForSensitiveData = /mot de passe|identifiants|code de connexion|code otp/.test(normalized);
    if (isOfficialDomain || !asksForSensitiveData) return { score: 0, signals: [] };

    const signal: ScamSignal = {
      type: "IMPERSONATION",
      score: 0.7,
      confidence: 0.7,
      description: `Le contenu revendique l'identité de ${brand} sans correspondre à un domaine officiel connu.`,
      evidence: brand,
    };
    return { score: signal.score * signal.confidence, signals: [signal] };
  }
}
export const scamIdentityService = new ScamIdentityService();
