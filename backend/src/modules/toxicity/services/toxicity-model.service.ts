import { fileURLToPath } from "node:url";
import { asNumberArray, OnnxModelRunner } from "../../../shared/ml/onnx/onnx-runner.ts";
import type { ToxicityModelSignal } from "../types/toxicity.ts";
import type { ToxicityAiProvider, ToxicityAiProviderResult } from "./toxicity-ai.service.ts";

const MODEL_FILENAME = "models/toxic_detector.onnx";
const MODEL_BASE_DIR = new URL("..", import.meta.url);

export class ToxicityOnnxModelProvider implements ToxicityAiProvider {
  private runner: OnnxModelRunner | null = null;

  async analyze(content: string): Promise<ToxicityAiProviderResult> {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return { categories: [], modelSignal: undefined };
    }

    const outputs = await this.getRunner().runText([normalizedContent]);
    const session = await this.getRunner().getSession();
    const labelName = session.outputNames.find((name) => name.toLowerCase().includes("label"));
    const probabilitiesName = session.outputNames.find((name) => name.toLowerCase().includes("prob"));

    if (!labelName || !probabilitiesName) {
      throw new Error("Le modèle ONNX de toxicité ne fournit pas les sorties attendues: label et probabilities.");
    }

    const labelOutput = outputs[labelName];
    const probabilitiesOutput = outputs[probabilitiesName];

    if (!labelOutput || !probabilitiesOutput) {
      throw new Error("Le modèle ONNX de toxicité ne fournit pas les sorties label/probabilities attendues.");
    }

    const labelValue = this.readLabel(labelOutput as { data: unknown });
    const probabilities = asNumberArray((probabilitiesOutput as { data: unknown }).data ?? []);

    if (probabilities.length < 2) {
      throw new Error("Le modèle ONNX de toxicité ne retourne pas une distribution de probabilités valide.");
    }

    const nonToxicProbability = Number(probabilities[0] ?? 0);
    const toxicProbability = Number(probabilities[1] ?? probabilities[0] ?? 0);
    const confidence = Math.max(0, Math.min(1, toxicProbability));
    const modelSignal: ToxicityModelSignal = {
      source: "ONNX",
      label: Number(labelValue),
      nonToxicProbability: Math.max(0, Math.min(1, nonToxicProbability)),
      toxicProbability: confidence,
      confidence,
      explanation: "Signal binaire ONNX: 0 = non toxique, 1 = toxique. Ce signal n'a pas de taxonomie SafePlace et ne remplace pas les catégories heuristiques.",
    };

    return {
      categories: [],
      modelSignal,
    };
  }

  private getRunner(): OnnxModelRunner {
    if (!this.runner) {
      const modelPath = fileURLToPath(new URL(MODEL_FILENAME, MODEL_BASE_DIR));
      void modelPath;
      this.runner = new OnnxModelRunner(MODEL_FILENAME, MODEL_BASE_DIR);
    }
    return this.runner;
  }

  private readLabel(labelTensor: { data: unknown }): number {
    const raw = labelTensor.data as unknown;
    const values = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && "length" in raw
        ? Array.from(raw as ArrayLike<unknown>)
        : [raw];

    const first = values[0];
    if (typeof first === "bigint") {
      return Number(first);
    }
    if (typeof first === "number") {
      return first;
    }
    return Number(first ?? 0);
  }
}

export const toxicityOnnxModelProvider = new ToxicityOnnxModelProvider();
