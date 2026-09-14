import assert from "node:assert/strict";
import { ScamContentService } from "./services/scam-content.service.ts";
import { ScamIdentityService } from "./services/scam-identity.service.ts";
import { ScamPatternService } from "./services/scam-pattern.service.ts";
import { ScamScoringService } from "./services/scam-scoring.service.ts";
import { ScamService } from "./services/scam.service.ts";
import { InvalidScamUrlError, ScamUrlService } from "./services/scam-url.service.ts";
import { parseHttpUrl } from "../../shared/utils/url.util.ts";

const contentService = new ScamContentService();
const identityService = new ScamIdentityService();
const patternService = new ScamPatternService();
const scoringService = new ScamScoringService();
const scamService = new ScamService();
const urlService = new ScamUrlService();

const normal = contentService.analyze("Bienvenue sur notre site.");
assert.equal(normal.signals.length, 0);
assert.equal(normal.score, 0);
assert.deepEqual(contentService.analyze("   "), { score: 0, signals: [] });

const payment = contentService.analyze("Envoyez immédiatement 500 000 Ar pour confirmer votre prix.");
assert.ok(payment.signals.some((signal) => signal.type === "PAYMENT_REQUEST"));
assert.ok(payment.signals.some((signal) => signal.type === "URGENCY"));
assert.ok(payment.score > normal.score);

const educationalPayment = contentService.analyze("Cet article explique comment éviter les arnaques au paiement.");
assert.ok(!educationalPayment.signals.some((signal) => signal.type === "PAYMENT_REQUEST"));
assert.ok(!educationalPayment.signals.some((signal) => signal.type === "PAYMENT_REQUEST" && signal.score >= 0.8));

const preventiveCredentials = contentService.analyze("Ne communiquez jamais votre mot de passe.");
assert.ok(!preventiveCredentials.signals.some((signal) => signal.type === "CREDENTIAL_REQUEST"));

const institutionalAlert = contentService.analyze("Microsoft publie une alerte contre le phishing.");
assert.ok(!institutionalAlert.signals.some((signal) => signal.type === "IMPERSONATION"));

const acceptedPayment = contentService.analyze("Les paiements par carte bancaire sont acceptés.");
assert.ok(!acceptedPayment.signals.some((signal) => signal.type === "PAYMENT_REQUEST"));

const educationalSupport = contentService.analyze("Cet article explique les dangers des faux supports.");
assert.ok(!educationalSupport.signals.some((signal) => signal.type === "FAKE_SUPPORT"));

const educationalLinks = contentService.analyze("Les liens raccourcis peuvent présenter un risque.");
assert.ok(!educationalLinks.signals.some((signal) => signal.type === "SUSPICIOUS_LINK"));

const support = contentService.analyze("Votre compte sera fermé. Appelez immédiatement ce numéro et communiquez votre code.");
assert.ok(support.signals.some((signal) => signal.type === "THREAT"));
assert.ok(support.signals.some((signal) => signal.type === "URGENCY"));
assert.ok(support.signals.some((signal) => signal.type === "CREDENTIAL_REQUEST"));

const prize = contentService.analyze("Félicitations ! Vous avez gagné 5 000 000 Ar. Cliquez ici pour réclamer votre prix.");
assert.ok(prize.signals.some((signal) => signal.type === "PRIZE"));
assert.ok(prize.signals.some((signal) => signal.type === "SUSPICIOUS_LINK"));

const fakeSupport = contentService.analyze("Appelez immédiatement notre support et communiquez votre mot de passe.");
assert.ok(fakeSupport.signals.some((signal) => signal.type === "FAKE_SUPPORT"));
assert.ok(fakeSupport.signals.some((signal) => signal.type === "CREDENTIAL_REQUEST"));
assert.ok(fakeSupport.signals.some((signal) => signal.type === "URGENCY"));

const englishPayment = contentService.analyze("Send the payment immediately to confirm your account.");
assert.ok(englishPayment.signals.some((signal) => signal.type === "PAYMENT_REQUEST"));
assert.ok(englishPayment.signals.some((signal) => signal.type === "URGENCY"));

const englishCredentials = contentService.analyze("Enter your password to recover your account.");
assert.ok(englishCredentials.signals.some((signal) => signal.type === "CREDENTIAL_REQUEST"));

const englishPrize = contentService.analyze("You won a prize. Click here to claim it.");
assert.ok(englishPrize.signals.some((signal) => signal.type === "PRIZE"));
assert.ok(englishPrize.signals.some((signal) => signal.type === "SUSPICIOUS_LINK"));

const institutional = identityService.analyze("Microsoft publie une alerte concernant les campagnes de phishing.", "https://example.com/alert");
assert.ok(!institutional.signals.some((signal) => signal.type === "IMPERSONATION"));
assert.ok(institutional.score <= 0.1);

const paypalArticle = identityService.analyze("PayPal recommande aux utilisateurs de ne jamais communiquer leur mot de passe.", "https://news.example.com/article");
assert.ok(!paypalArticle.signals.some((signal) => signal.type === "IMPERSONATION"));
assert.ok(paypalArticle.score <= 0.1);

const fakeMicrosoftSupport = identityService.analyze(
  "Nous sommes Microsoft Support. Communiquez immédiatement votre code de connexion afin de sécuriser votre compte.",
  "https://secure-example.com/login",
);
assert.ok(fakeMicrosoftSupport.signals.some((signal) => signal.type === "IMPERSONATION"));
assert.ok(fakeMicrosoftSupport.score > institutional.score);

const fakePaypalSupport = identityService.analyze(
  "PayPal Support : veuillez confirmer votre mot de passe pour éviter la suspension de votre compte.",
  "https://paypal-security-example.com/login",
);
assert.ok(fakePaypalSupport.signals.some((signal) => signal.type === "IMPERSONATION"));
assert.ok(fakePaypalSupport.score > paypalArticle.score);

const officialMicrosoft = identityService.analyze(
  "Microsoft Support vous aide à récupérer votre compte.",
  "https://support.microsoft.com/",
);
assert.equal(officialMicrosoft.score, 0);
assert.equal(officialMicrosoft.signals.length, 0);

const officialMicrosoftSubdomain = identityService.analyze(
  "Votre compte Microsoft nécessite une vérification.",
  "https://login.microsoft.com/",
);
assert.equal(officialMicrosoftSubdomain.score, 0);
assert.equal(officialMicrosoftSubdomain.signals.length, 0);

const brandComparison = identityService.analyze(
  "Cet article compare Microsoft, Google et Apple.",
  "https://example.com/article",
);
assert.equal(brandComparison.score, 0);

const educationalBrandPassword = identityService.analyze(
  "Cet article explique pourquoi Microsoft recommande de ne jamais partager son mot de passe.",
  "https://example.com/security",
);
assert.equal(educationalBrandPassword.score, 0);

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

const httpUrl = urlService.analyze("http://example.com/");
assert.equal(httpUrl.domain, "example.com");
assert.ok(httpUrl.score < 0.85);

const publicIpUrl = urlService.analyze("http://8.8.8.8/login");
assert.ok(publicIpUrl.signals.some((signal) => signal.type === "SUSPICIOUS_LINK"));
assert.ok(publicIpUrl.score < 0.85);

const longUrl = urlService.analyze(`https://example.com/${"a".repeat(200)}`);
assert.ok(longUrl.signals.some((signal) => signal.description.includes("exceptionnellement longue")));

const longHostnameUrl = urlService.analyze(`https://${"a".repeat(85)}.example.com/`);
assert.ok(longHostnameUrl.signals.some((signal) => signal.description.includes("nom d'hôte")));

const manySubdomainsUrl = urlService.analyze("https://login.verify.account.security.example.com/");
assert.ok(manySubdomainsUrl.signals.some((signal) => signal.description.includes("sous-domaines")));

const unusualPortUrl = urlService.analyze("https://example.com:4444/login");
assert.ok(unusualPortUrl.signals.some((signal) => signal.description.includes("port")));
assert.ok(unusualPortUrl.score < 0.85);

const credentialsUrl = urlService.analyze("https://user:password@example.com/");
assert.ok(credentialsUrl.signals.some((signal) => signal.description.includes("identifiants intégrés")));

const suspiciousParameterUrl = urlService.analyze("https://example.com/login?redirect=/dashboard");
assert.ok(suspiciousParameterUrl.signals.some((signal) => signal.description.includes("paramètres")));

const embeddedRedirectUrl = urlService.analyze("https://example.com/?redirect=https%3A%2F%2Fother.example");
assert.ok(embeddedRedirectUrl.signals.some((signal) => signal.description.includes("destination HTTP/HTTPS")));

const nestedEncodingUrl = urlService.analyze("https://example.com/?redirect=https%253A%252F%252Fother.example");
assert.ok(nestedEncodingUrl.signals.some((signal) => signal.description.includes("encodage URL")));

const normalEncodingUrl = urlService.analyze("https://example.com/search?q=hello%20world");
assert.equal(normalEncodingUrl.signals.length, 0);

for (const invalidUrl of [
  "ceci-n-est-pas-une-url",
  "ftp://example.com",
  "file:///tmp/test",
  "javascript:alert(1)",
]) {
  assert.throws(
    () => urlService.analyze(invalidUrl),
    (error: unknown) => error instanceof InvalidScamUrlError,
  );
}

for (const analysis of [
  httpUrl,
  publicIpUrl,
  punycodeUrl,
  unusualPortUrl,
  suspiciousParameterUrl,
]) {
  assert.ok(analysis.score >= 0 && analysis.score <= 1);
  assert.ok(analysis.signals.every((signal) => signal.score >= 0 && signal.score <= 1));
  assert.ok(analysis.signals.every((signal) => signal.confidence >= 0 && signal.confidence <= 1));
}

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

const urlOnly = scoringService.calculate({
  urlScore: 0.9,
  contentScore: 0,
  identityScore: 0,
});
assert.ok(urlOnly.score < 0.65);
assert.notEqual(urlOnly.verdict, "CRITICAL_RISK");

const contentAndIdentity = scoringService.calculate({
  urlScore: 0,
  contentScore: 0.8,
  identityScore: 0.8,
});
assert.ok(contentAndIdentity.score > contentOnly.score);

const multipleHighScores = scoringService.calculate({
  urlScore: 0.9,
  contentScore: 0.9,
  identityScore: 0.9,
});
assert.ok(["HIGH_RISK", "CRITICAL_RISK"].includes(multipleHighScores.verdict));

const signals = patternService.detect("Envoyez immédiatement 500 Ar.");
assert.ok(signals.every((signal) => signal.score >= 0 && signal.score <= 1));
assert.ok(signals.every((signal) => signal.confidence >= 0 && signal.confidence <= 1));
assert.ok(signals.every((signal) => signal.description.length > 0));
assert.ok(signals.every((signal) => signal.evidence !== undefined));
assert.equal(new Set(signals.map((signal) => signal.type)).size, signals.length);

const normalPage = scamService.analyze({
  url: "https://example.com/",
  title: "Bienvenue",
  content: "Bienvenue sur notre site.",
});
assert.equal(normalPage.score, 0);
assert.equal(normalPage.verdict, "UNKNOWN");
assert.equal(normalPage.signals.length, 0);

const paymentPage = scamService.analyze({
  url: "https://example.com/payment",
  content: "Envoyez immédiatement 500 000 Ar pour confirmer votre compte.",
});
assert.ok(paymentPage.signals.some((signal) => signal.type === "PAYMENT_REQUEST"));
assert.ok(paymentPage.signals.some((signal) => signal.type === "URGENCY"));
assert.ok(paymentPage.score > normalPage.score);

const threatCredentialsPage = scamService.analyze({
  url: "https://example.com/login",
  content: "Votre compte sera bloqué. Communiquez immédiatement votre code OTP.",
});
assert.ok(threatCredentialsPage.signals.some((signal) => signal.type === "THREAT"));
assert.ok(threatCredentialsPage.signals.some((signal) => signal.type === "CREDENTIAL_REQUEST"));
assert.ok(threatCredentialsPage.signals.some((signal) => signal.type === "URGENCY"));

const prizePage = scamService.analyze({
  url: "https://example.com/prize",
  content: "Félicitations ! Vous avez gagné 5 000 000 Ar. Cliquez ici pour réclamer votre prix.",
});
assert.ok(prizePage.signals.some((signal) => signal.type === "PRIZE"));
assert.ok(prizePage.signals.some((signal) => signal.type === "SUSPICIOUS_LINK"));

const fakeSupportPage = scamService.analyze({
  url: "https://example.com/support",
  content: "Appelez immédiatement notre support et communiquez votre mot de passe.",
});
assert.ok(fakeSupportPage.signals.some((signal) => signal.type === "FAKE_SUPPORT"));
assert.ok(fakeSupportPage.signals.some((signal) => signal.type === "CREDENTIAL_REQUEST"));

const technicalUrlWithLegitimateContent = scamService.analyze({
  url: "http://192.168.1.20/login",
  content: "Bienvenue sur le portail interne.",
});
assert.ok(technicalUrlWithLegitimateContent.urlScore > 0);
assert.equal(technicalUrlWithLegitimateContent.contentScore, 0);

const stableInput = {
  url: "https://example.com/payment",
  title: "Payment",
  content: "Send the payment immediately to confirm your account.",
};
const stableFirst = scamService.analyze(stableInput);
const stableSecond = scamService.analyze(stableInput);
assert.deepEqual(
  {
    score: stableFirst.score,
    verdict: stableFirst.verdict,
    urlScore: stableFirst.urlScore,
    contentScore: stableFirst.contentScore,
    identityScore: stableFirst.identityScore,
    signals: stableFirst.signals,
  },
  {
    score: stableSecond.score,
    verdict: stableSecond.verdict,
    urlScore: stableSecond.urlScore,
    contentScore: stableSecond.contentScore,
    identityScore: stableSecond.identityScore,
    signals: stableSecond.signals,
  },
);

console.log("Scam module tests passed.");
