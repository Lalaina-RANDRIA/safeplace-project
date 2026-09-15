import assert from "node:assert/strict";
import { createApp } from "../../app.ts";
import { rabbitHoleController } from "./controllers/rabbit-hole.controller.ts";
import { FeatureExtractionService } from "./services/feature-extraction.service.ts";
import { recommendationService } from "./services/recommendation.service.ts";
import { RabbitHoleService } from "./services/rabbit-hole.service.ts";
import type { RabbitHoleContent, RabbitHoleInput } from "./types/rabbit-hole.ts";

const featureService = new FeatureExtractionService();

const neutralContents: RabbitHoleContent[] = [
  { id: "a", text: "Le centre historique accueille des visiteurs chaque semaine." },
  { id: "b", text: "Un article sur les marchés locaux décrit une initiative touristique." },
  { id: "c", text: "Une note sur l’innovation culturelle présente des projets variés." },
];

const repetitiveContents: RabbitHoleContent[] = [
  { id: "a", text: "Le marché local bouge vite et les gens suivent la même tendance." },
  { id: "b", text: "Le marché local bouge vite et les gens suivent la même tendance." },
  { id: "c", text: "Le marché local bouge vite et les gens suivent la même tendance." },
];

const recommendedContents: RabbitHoleContent[] = [
  { id: "root", text: "Article principal", recommendedFrom: undefined },
  { id: "child-1", text: "Suite détaillée", recommendedFrom: "root" },
  { id: "child-2", text: "Conclusion", recommendedFrom: "child-1" },
  { id: "child-3", text: "Complément", recommendedFrom: "child-2" },
];

const temporalContents: RabbitHoleContent[] = [
  { id: "a", text: "Début", timestamp: "2024-01-01T09:00:00.000Z" },
  { id: "b", text: "Suite", timestamp: "2024-01-01T09:15:00.000Z" },
  { id: "c", text: "Conclusion accrue", timestamp: "2024-01-01T09:35:00.000Z" },
];

const neutralFeatures = featureService.extract(neutralContents);
assert.equal(neutralFeatures.sequenceLength, 3);
assert.equal(neutralFeatures.uniqueVideos, 3);
assert.ok(neutralFeatures.repetitionScore < 0.5);
assert.ok(neutralFeatures.diversityScore > 0.5);

const repetitiveFeatures = featureService.extract(repetitiveContents);
assert.ok(repetitiveFeatures.repetitionScore > 0.5);
assert.ok(repetitiveFeatures.diversityScore < 0.5);

const recommendationScore = recommendationService.calculate(recommendedContents);
assert.ok(recommendationScore >= 0 && recommendationScore <= 1);
assert.ok(recommendationScore > 0);
assert.equal(recommendationService.calculate([]), 0);

const temporalFeatures = featureService.extract(temporalContents);
assert.ok(temporalFeatures.sessionTime > 0);
assert.ok(temporalFeatures.clickDepth >= 0);

const sameTextFeatures = featureService.extract([
  { id: "a", text: "Contenu identique" },
  { id: "b", text: "Contenu identique" },
  { id: "c", text: "Contenu identique" },
]);
assert.ok(sameTextFeatures.repetitionScore > 0.75);
assert.ok(sameTextFeatures.diversityScore < 0.5);

const differentTextFeatures = featureService.extract([
  { id: "a", text: "Le marché agricole a connu une baisse brutale." },
  { id: "b", text: "Un groupe de passionnés de cinéma annonce un festival." },
  { id: "c", text: "Un article sur l’enseignement présente une réforme." },
]);
assert.ok(differentTextFeatures.repetitionScore < 0.3);
assert.ok(differentTextFeatures.diversityScore > 0.7);

const mlProvider = {
  async predict() {
    return { label: "LOW", probabilities: { LOW: 0.81, MEDIUM: 0.13, HIGH: 0.06 } };
  },
};

const service = new RabbitHoleService({ modelProvider: mlProvider as never });
const lowRisk = await service.analyze({ url: "https://example.com/case-low", contents: neutralContents });
assert.equal(lowRisk.verdict, "LOW_RISK");
assert.equal(lowRisk.modelSource, "ML");
assert.equal(lowRisk.factors.topicRepetitionScore >= 0 && lowRisk.factors.topicRepetitionScore <= 1, true);

const mediumService = new RabbitHoleService({
  modelProvider: { async predict() { return { label: "MEDIUM", probabilities: { LOW: 0.15, MEDIUM: 0.7, HIGH: 0.15 } }; } },
});
const medium = await mediumService.analyze({ url: "https://example.com/case-medium", contents: repetitiveContents });
assert.equal(medium.verdict, "MEDIUM_RISK");

const highService = new RabbitHoleService({
  modelProvider: { async predict() { return { label: "HIGH", probabilities: { LOW: 0.06, MEDIUM: 0.18, HIGH: 0.76 } }; } },
});
const high = await highService.analyze({ url: "https://example.com/case-high", contents: repetitiveContents });
assert.equal(high.verdict, "HIGH_RISK");

const fallbackService = new RabbitHoleService({ modelProvider: undefined });
const fallback = await fallbackService.analyze({ url: "https://example.com/case-fallback", contents: repetitiveContents });
assert.equal(fallback.modelSource, "HEURISTIC");
assert.ok(fallback.score >= 0 && fallback.score <= 1);

const app = createApp();
const invalidUrl = { url: "not-a-url", contents: [] };
const controllerResponse = {
  statusCode: 0,
  payload: undefined as unknown,
  status(code: number) { this.statusCode = code; return this; },
  json(payload: unknown) { this.payload = payload; return this; },
};
await rabbitHoleController.analyze({ body: invalidUrl } as never, controllerResponse as never);
assert.equal(controllerResponse.statusCode, 400);
assert.equal(app !== undefined, true);

assert.throws(() => {
  featureService.extract([{ id: "x", text: "" }]);
}, /text/);

assert.throws(() => {
  featureService.extract([] as RabbitHoleContent[]);
}, /contenus/i);

const invalidInput: RabbitHoleInput = { url: "https://example.com", contents: [{ id: "x", text: "ok" }, { id: "y", text: "" }] };
assert.throws(() => featureService.extract(invalidInput.contents), /texte|text/i);

console.log("Rabbit Hole tests passed.");
