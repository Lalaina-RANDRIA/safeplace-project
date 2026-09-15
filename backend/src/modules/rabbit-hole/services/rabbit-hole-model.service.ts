import * as ort from "onnxruntime-node";
import { fileURLToPath } from "node:url";
import type { RabbitHoleFeatures, RabbitHoleModelPrediction, RabbitHoleModelProvider } from "../types/rabbit-hole";

const MODEL_PATH = new URL("../models/rabbit_hole_model.onnx", import.meta.url);
const CLASS_ORDER = ["HIGH", "LOW", "MEDIUM"] as const;

export class RabbitHoleModelService implements RabbitHoleModelProvider {
  private session: ort.InferenceSession | null = null;

  async predict(features: RabbitHoleFeatures): Promise<RabbitHoleModelPrediction> {
    const validated = this.validateFeatures(features);
    const session = await this.getSession();
    const inputName = session.inputNames[0];
    if (!inputName) {
      throw new Error("Le modèle ONNX ne contient pas d’entrée valide.");
    }

    const input = new ort.Tensor("float32", Float32Array.from(validated), [1, 6]);
    const outputs = await session.run({ [inputName]: input });
    const [labelName, probabilityName] = session.outputNames;

    if (!labelName || !probabilityName) {
      throw new Error("Le modèle ONNX ne fournit pas les sorties attendues: label et probabilities.");
    }

    const labelTensor = outputs[labelName];
    const probabilityTensor = outputs[probabilityName];

    if (!labelTensor || !probabilityTensor) {
      throw new Error("Le modèle ONNX ne fournit pas les sorties attendues: label et probabilities.");
    }

    const labelValue = this.readLabel(labelTensor as { data: unknown });
    const probabilities = this.readProbabilities(probabilityTensor as { data: Float32Array | number[] | Iterable<number> });
    const safeLabel = labelValue as "LOW" | "MEDIUM" | "HIGH";

    if (!this.isValidLabel(safeLabel)) {
      throw new Error(`Label ONNX invalide: ${labelValue}`);
    }

    return {
      label: safeLabel,
      probabilities: {
        LOW: probabilities.LOW,
        MEDIUM: probabilities.MEDIUM,
        HIGH: probabilities.HIGH,
      },
    };
  }

  private validateFeatures(features: RabbitHoleFeatures): number[] {
    const values = [
      features.sequenceLength,
      features.clickDepth,
      features.sessionTime,
      features.uniqueVideos,
      features.repetitionScore,
      features.diversityScore,
    ];

    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
      throw new Error("Les six features du modèle doivent être des nombres finis.");
    }

    const repetition = features.repetitionScore;
    const diversity = features.diversityScore;
    if (repetition < 0 || repetition > 1 || diversity < 0 || diversity > 1) {
      throw new Error("repetitionScore et diversityScore doivent être compris entre 0 et 1.");
    }

    if (features.sequenceLength < 0 || features.uniqueVideos < 0 || features.clickDepth < 0 || features.sessionTime < 0) {
      throw new Error("sequenceLength, uniqueVideos, clickDepth et sessionTime doivent être non négatifs.");
    }

    return [
      features.sequenceLength,
      features.clickDepth,
      features.sessionTime,
      features.uniqueVideos,
      repetition,
      diversity,
    ];
  }

  private async getSession(): Promise<ort.InferenceSession> {
    if (!this.session) {
      const modelFilePath = fileURLToPath(MODEL_PATH);
      this.session = await ort.InferenceSession.create(modelFilePath);
    }
    return this.session;
  }

  private readLabel(labelTensor: { data: unknown }): string {
    const raw = labelTensor.data as unknown;
    if (Array.isArray(raw)) {
      return String(raw[0] ?? "");
    }
    if (raw && typeof raw === "object" && "length" in raw) {
      const values = Array.from(raw as ArrayLike<unknown>);
      return String(values[0] ?? "");
    }
    return String(raw ?? "");
  }

  private readProbabilities(probabilityTensor: { data: Float32Array | number[] | Iterable<number> }): { LOW: number; MEDIUM: number; HIGH: number } {
    const raw = Array.from(probabilityTensor.data as Iterable<number>);
    const mapping: Record<string, number> = {};
    for (const [index, label] of CLASS_ORDER.entries()) {
      mapping[label] = Number(raw[index] ?? 0);
    }
    return {
      LOW: mapping.LOW ?? 0,
      MEDIUM: mapping.MEDIUM ?? 0,
      HIGH: mapping.HIGH ?? 0,
    };
  }

  private isValidLabel(label: string): label is "LOW" | "MEDIUM" | "HIGH" {
    return label === "LOW" || label === "MEDIUM" || label === "HIGH";
  }
}

export const rabbitHoleModelService = new RabbitHoleModelService();
