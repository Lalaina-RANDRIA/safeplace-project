import assert from "node:assert/strict";
import { ScamContentService } from "./services/scam-content.service.ts";
import { ScamIdentityService } from "./services/scam-identity.service.ts";
import { ScamPatternService } from "./services/scam-pattern.service.ts";
import { ScamScoringService } from "./services/scam-scoring.service.ts";
import { ScamUrlService } from "./services/scam-url.service.ts";
import { parseHttpUrl } from "../../shared/utils/url.util.ts";

const contentService = new ScamContentService();
const identityService = new ScamIdentityService();
const patternService = new ScamPatternService();
const scoringService = new ScamScoringService();
const urlService = new ScamUrlService();

const normal = contentService.analyze("Bienvenue sur notre site.");
assert.equal(normal.signals.length, 0);
assert.equal(normal.score, 0);
assert.deepEqual(contentService.analyze("   "), { score: 0, signals: [] });

const payment = contentService.analyze("Envoyez immédiatement 500 000 Ar pour confirmer votre prix.");
assert.ok(payment.signals.some((signal) => signal.type === "PAYMENT_REQUEST"));
assert.ok(payment.signals.some((signal) => signal.type === "URGENCY"));
assert.ok(payment.score > normal.score);

const support = contentService.analyze("Votre compte sera fermé. Appelez immédiatement ce numéro et communiquez votre code.");
assert.ok(support.signals.some((signal) => signal.type === "THREAT"));
assert.ok(support.signals.some((signal) => signal.type === "URGENCY"));
assert.ok(support.signals.some((signal) => signal.type === "CREDENTIAL_REQUEST"));

const educational = contentService.analyze("Cet article explique comment reconnaître une arnaque au paiement.");
assert.ok(!educational.signals.some((signal) => signal.type === "PAYMENT_REQUEST"));

const institutional = identityService.analyze("Microsoft publie une alerte concernant les campagnes de phishing.", "https://example.com/alert");
assert.ok(!institutional.signals.some((signal) => signal.type === "IMPERSONATION"));

const ipUrl = urlService.analyze("http://192.168.1.20/login");
assert.ok(ipUrl.signals.some((signal) => signal.type === "SUSPICIOUS_LINK"));
assert.ok(ipUrl.score < 0.85);

const normalUrl = urlService.analyze("https://example.com/");
assert.equal(normalUrl.signals.length, 0);
assert.equal(normalUrl.score, 0);
assert.equal(parseHttpUrl("not-a-url"), undefined);

const punycodeUrl = urlService.analyze("https://xn--pple-43d.example/login");
assert.ok(punycodeUrl.signals.some((signal) => signal.type === "SUSPICIOUS_LINK"));
assert.ok(punycodeUrl.score < 0.85);

const insufficient = scoringService.calculate({
  urlScore: 0,
  contentScore: 0,
  identityScore: 0,
});
assert.equal(insufficient.verdict, "UNKNOWN");
assert.equal(insufficient.score, 0);

const contentOnly = scoringService.calculate({
  urlScore: 0,
  contentScore: 0.8,
  identityScore: 0,
});
assert.equal(contentOnly.score, 0.37);
assert.equal(contentOnly.contentScore, 0.8);
assert.equal(Object.keys(contentOnly).some((key) => key.endsWith("Score") && key !== "urlScore" && key !== "contentScore" && key !== "identityScore"), false);

const combined = scoringService.calculate({
  urlScore: 0.6,
  contentScore: 0.8,
  identityScore: 0,
});
assert.equal(combined.score, 0.55);

const withReputation = scoringService.calculate({
  urlScore: 0.4,
  contentScore: 0.8,
  identityScore: 0.6,
  reputationScore: 0.9,
});
assert.equal(withReputation.score, 0.67);

const signals = patternService.detect("Envoyez immédiatement 500 Ar.");
assert.ok(signals.every((signal) => signal.score >= 0 && signal.score <= 1));
assert.ok(signals.every((signal) => signal.confidence >= 0 && signal.confidence <= 1));

console.log("Scam module tests passed.");
