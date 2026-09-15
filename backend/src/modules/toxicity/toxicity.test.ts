import assert from "node:assert/strict";
import { ToxicityService } from "./services/toxicity.service.ts";
import { ToxicityPatternService } from "./services/toxicity-pattern.service.ts";
import { ToxicityScoringService } from "./services/toxicity-scoring.service.ts";
import { ToxicityAiService, type ToxicityAiProvider } from "./services/toxicity-ai.service.ts";
import { ToxicityOnnxModelProvider } from "./services/toxicity-model.service.ts";

const patternService = new ToxicityPatternService();
const scoringService = new ToxicityScoringService();
const service = new ToxicityService();

assert.equal(patternService.detect("Bienvenue sur notre site.").length, 0);
assert.equal(patternService.detect("Cet article explique pourquoi le terme 'idiot' est insultant.").length, 0);
assert.ok(patternService.detect("Tu es un idiot.").some((signal) => signal.category === "INSULT"));
assert.ok(patternService.detect("Je vais te faire du mal.").some((signal) => signal.category === "THREAT"));
assert.equal(patternService.detect("Cet article parle des menaces reçues par un journaliste.").length, 0);
assert.ok(patternService.detect("Tout le monde se moque de toi.").some((signal) => signal.category === "BULLYING"));
assert.ok(patternService.detect("Vas-y, prouve-le.").some((signal) => signal.category === "PROVOCATION"));
assert.ok(patternService.detect("You are stupid.").some((signal) => signal.category === "INSULT"));
assert.ok(patternService.detect("I will hurt you.").some((signal) => signal.category === "THREAT"));

const threatScore = scoringService.calculate(patternService.detect("Je vais te faire du mal."));
assert.ok(threatScore.score > 0.5);
assert.notEqual(threatScore.verdict, "LOW_RISK");
assert.equal(scoringService.calculate([]).score, 0);

const neutral = await service.analyze({ url: "https://example.com", content: "Une opinion négative mais respectueuse." });
assert.equal(neutral.categories.length, 0);
assert.equal(neutral.aiStatus, "NOT_CONFIGURED");
assert.equal(neutral.aiAvailable, false);
assert.equal(neutral.verdict, "LOW_RISK");

const directThreat = await service.analyze({ url: "https://example.com", content: "Je vais te faire du mal." });
assert.ok(directThreat.categories.includes("THREAT"));
assert.ok(directThreat.score > 0);
assert.ok(directThreat.explanation.includes("threat"));

const patternProvider: ToxicityAiProvider = {
  async analyze() {
    return { categories: [{ category: "INSULT", confidence: 0.9 }] };
  },
};
const aiService = new ToxicityAiService(patternProvider);
const aiResult = await aiService.analyze("texte");
assert.equal(aiResult.status, "AVAILABLE");
assert.equal(aiResult.available, true);
assert.deepEqual(aiResult.categories, ["INSULT"]);

const failingProvider: ToxicityAiProvider = {
  async analyze() { throw new Error("provider down"); },
};
const failedAi = await new ToxicityAiService(failingProvider).analyze("texte");
assert.equal(failedAi.status, "ERROR");
assert.equal(failedAi.available, false);

const onnxProvider = new ToxicityOnnxModelProvider();
const onnxResult = await onnxProvider.analyze("Tu es un idiot.");
assert.equal(onnxResult.categories.length, 0);
assert.ok(onnxResult.modelSignal);
assert.equal(onnxResult.modelSignal?.label, 1);
assert.ok((onnxResult.modelSignal?.toxicProbability ?? 0) >= 0.7);
assert.equal(onnxResult.modelSignal?.source, "ONNX");
assert.ok(!onnxResult.categories.some((entry) => entry.category === "OTHER"));

const neutralOnnxResult = await onnxProvider.analyze("Bienvenue sur notre site.");
assert.equal(neutralOnnxResult.categories.length, 0);
assert.ok(neutralOnnxResult.modelSignal);
assert.equal(neutralOnnxResult.modelSignal?.label, 0);
assert.ok((neutralOnnxResult.modelSignal?.toxicProbability ?? 0) < 0.7);

assert.ok(patternService.detect("Tu es un idiot.").some((signal) => signal.category === "INSULT"));

console.log("Toxicity module tests passed.");
