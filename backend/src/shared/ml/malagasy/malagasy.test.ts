import assert from "node:assert/strict";
import { malagasyLanguageRouter, malagasyMlService } from "./index.ts";

const pluginText = "Tsy tiako mihitsy izany";
const frenchText = "Bonjour tout le monde, c'est un message simple.";
const englishText = "This is a very simple English sentence.";

const pluginVector = await malagasyMlService.vectorizeText(pluginText);
assert.ok(Array.isArray(pluginVector));
assert.ok(pluginVector.length > 0);
assert.ok(pluginVector.every((value) => typeof value === "number" && Number.isFinite(value)));

const classifierVector = await malagasyMlService.syntheticClassifierVector();
assert.equal(classifierVector.length, 10934);

const routedMalagasy = malagasyLanguageRouter.route(pluginText);
assert.equal(routedMalagasy.language, "mg");
assert.equal(routedMalagasy.target, "malagasy_plugin");

const routedFrench = malagasyLanguageRouter.route(frenchText);
assert.equal(routedFrench.language, "fr");
assert.equal(routedFrench.target, "native");

const routedEnglish = malagasyLanguageRouter.route(englishText);
assert.equal(routedEnglish.language, "en");
assert.equal(routedEnglish.target, "native");

const sentiment = await malagasyMlService.analyzeText(pluginText);
assert.equal(typeof sentiment.label, "string");
assert.ok(Array.isArray(sentiment.classScores));
assert.equal(sentiment.classScores.length, 2);
assert.ok(Number.isFinite(sentiment.decisionScore));

const classifierOutput = await malagasyMlService.classifyTfIdf(classifierVector);
assert.equal(typeof classifierOutput.label, "string");
assert.ok(Array.isArray(classifierOutput.classScores));
assert.equal(classifierOutput.classScores.length, 2);
assert.ok(Number.isFinite(classifierOutput.decisionScore));

console.log("Malagasy ONNX shared ML tests passed.");
