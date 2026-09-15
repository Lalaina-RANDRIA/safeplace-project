import assert from "node:assert/strict";
import { AnalysisService } from "./services/analysis.service.ts";
import { ClaimService } from "./services/claim.service.ts";
import { FactCheckService } from "./services/factcheck.service.ts";
import { ScoringService } from "./services/scoring.service.ts";
import { SearchService } from "./services/search.service.ts";
import { VerificationService } from "./services/verification.service.ts";
import { QueryService } from "./services/query.service.ts";
import { CredibilityService } from "./services/credibility.service.ts";
import { SynthesisService } from "./services/synthesis.service.ts";
import type { Claim } from "./types/analysis.ts";
import type { Evidence } from "./types/evidence.ts";

const claimService = new ClaimService();
const searchService = new SearchService();
const factCheckService = new FactCheckService();
const verificationService = new VerificationService();
const scoringService = new ScoringService();
const queryService = new QueryService();
const credibilityService = new CredibilityService();
const synthesisService = new SynthesisService();

const parisClaims = await claimService.extractClaims("Paris est la capitale de la France.");
assert.equal(parisClaims.length, 1);
assert.equal(parisClaims[0]?.checkable, true);

const opinionClaims = await claimService.extractClaims("Je pense que cette information est fausse.");
assert.equal(opinionClaims.length, 0);

const actionClaims = await claimService.extractClaims("Partagez cet article !");
assert.equal(actionClaims.length, 0);

const questionClaims = await claimService.extractClaims("Êtes-vous d'accord avec cette affirmation ?");
assert.equal(questionClaims.length, 0);

const studyClaims = await claimService.extractClaims("Selon une étude, 42 % des utilisateurs utilisent ce service.");
assert.equal(studyClaims.length, 1);

const duplicateClaims = await claimService.extractClaims("Paris est la capitale de la France. Paris est la capitale de la France.");
assert.equal(duplicateClaims.length, 1);
const duplicateClaimsAgain = await claimService.extractClaims("Paris est la capitale de la France. Paris est la capitale de la France.");
assert.equal(duplicateClaims[0]?.id, duplicateClaimsAgain[0]?.id);

const generatedQueries = queryService.generate(parisClaims[0]!);
assert.equal(generatedQueries.length, 2);
assert.equal(generatedQueries[0]?.kind, "PRIMARY");
assert.equal(generatedQueries[1]?.kind, "FACT_CHECK");
assert.equal(queryService.generate({ ...parisClaims[0]!, text: "" }).length, 0);

assert.equal((await claimService.extractClaims("")).length, 0);
assert.equal((await claimService.extractClaims("Cette information est incroyable !")).length, 0);
assert.ok((await claimService.extractClaims("Le nombre officiel est 42.")).length <= 1);
assert.ok((await claimService.extractClaims("Paris est la capitale de la France. ".repeat(200))).length <= 200);

assert.deepEqual(await searchService.searchEvidence("Paris est la capitale de la France."), []);
assert.deepEqual(await factCheckService.searchFactChecks("Paris est la capitale de la France."), []);

const claim: Claim = { id: "claim-test", text: "Paris est la capitale de la France.", importance: 0.8, checkable: true };
const evidence = (url: string, stance: Evidence["stance"], reliability: Evidence["reliability"], confidenceScore = 0.9): Evidence => ({
  id: url,
  title: "Source de test",
  url,
  sourceName: new URL(url).hostname,
  sourceType: "REFERENCE",
  reliability,
  retrievedAt: "2026-01-01T00:00:00.000Z",
  excerpt: "Extrait de test",
  stance,
  relevanceScore: 0.95,
  confidenceScore,
});

const officialEvidence = { ...evidence("https://example.gov/source", "NEUTRAL", "VERY_HIGH"), sourceType: "OFFICIAL" as const };
const credibility = credibilityService.evaluate(officialEvidence);
assert.equal(credibility.level, "HIGH");
assert.ok(credibility.score >= 0 && credibility.score <= 1);
assert.equal(await synthesisService.synthesize(claim, [officialEvidence]), undefined);

const supported = await verificationService.verifyClaims(
  [claim],
  new Map([[claim.text, [evidence("https://source-a.example/support", "SUPPORTS", "HIGH"), evidence("https://source-b.example/support", "SUPPORTS", "HIGH")]]]),
  new Map(),
);
assert.equal(supported[0]?.verdict, "SUPPORTED");

const refuted = await verificationService.verifyClaims(
  [claim],
  new Map([[claim.text, [evidence("https://source-a.example/refute", "REFUTES", "HIGH"), evidence("https://source-b.example/refute", "REFUTES", "HIGH")]]]),
  new Map(),
);
assert.equal(refuted[0]?.verdict, "REFUTED");

const uncertain = await verificationService.verifyClaims(
  [claim],
  new Map([[claim.text, [evidence("https://source-a.example/mixed", "SUPPORTS", "HIGH"), evidence("https://source-b.example/mixed", "REFUTES", "HIGH")]]]),
  new Map(),
);
assert.equal(uncertain[0]?.verdict, "UNCERTAIN");

const neutral = await verificationService.verifyClaims(
  [claim],
  new Map([[claim.text, [evidence("https://source-a.example/neutral", "NEUTRAL", "MEDIUM")]]]),
  new Map(),
);
assert.equal(neutral[0]?.verdict, "NOT_ENOUGH_INFO");

const duplicateDomain = await verificationService.verifyClaims(
  [claim],
  new Map([[claim.text, [evidence("https://same.example/one", "SUPPORTS", "HIGH"), evidence("https://same.example/two", "SUPPORTS", "HIGH")]]]),
  new Map(),
);
assert.equal(duplicateDomain[0]?.evidence.length, 1);

const emptyScore = scoringService.calculateOverallScore([]);
assert.equal(emptyScore.score, 0.5);
assert.equal(emptyScore.verdict, "NOT_ENOUGH_INFO");

const supportedScore = scoringService.calculateOverallScore(supported);
assert.ok(supportedScore.score >= 0 && supportedScore.score <= 1);
assert.equal(supportedScore.verdict, "SUPPORTED");

const uncertainScore = scoringService.calculateOverallScore(uncertain);
assert.ok(uncertainScore.score >= 0 && uncertainScore.score <= 1);

const analysisService = new AnalysisService();
const unavailableAnalysis = await analysisService.analyzePage({
  url: "https://example.com",
  title: "Test",
  content: "Paris est la capitale de la France.",
});
assert.equal(unavailableAnalysis.totalClaims, 1);
assert.equal(unavailableAnalysis.claims[0]?.verdict, "NOT_ENOUGH_INFO");
assert.ok(unavailableAnalysis.overallScore >= 0 && unavailableAnalysis.overallScore <= 1);

console.log("Fake News module tests passed.");
