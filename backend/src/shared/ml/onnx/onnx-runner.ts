import * as ort from "onnxruntime-node";
import { fileURLToPath } from "node:url";

export type OnnxModelOutput = Record<string, ort.Tensor | undefined>;

export class OnnxModelRunner {
  private readonly modelPath: string;
  private session: ort.InferenceSession | null = null;

  constructor(modelFilename: string, baseDir: URL) {
    this.modelPath = fileURLToPath(new URL(modelFilename, baseDir));
  }

  async runText(texts: string[]): Promise<OnnxModelOutput> {
    const session = await this.getSession();
    const inputName = session.inputNames[0];
    if (!inputName) {
      throw new Error("Le modèle ONNX ne contient pas d’entrée valide.");
    }

    const rows = texts.map((text) => [text]);
    const input = new ort.Tensor("string", rows.flat(), [texts.length, 1]);
    return await session.run({ [inputName]: input });
  }

  async runVector(vector: number[]): Promise<OnnxModelOutput> {
    const session = await this.getSession();
    const inputName = session.inputNames[0];
    if (!inputName) {
      throw new Error("Le modèle ONNX ne contient pas d’entrée valide.");
    }

    if (!vector.length) {
      throw new Error("Le vecteur d’entrée ONNX ne peut pas être vide.");
    }

    const expectedDimension = this.getInputDimension(session);
    if (expectedDimension !== null && vector.length !== expectedDimension) {
      throw new Error(`Dimension de vecteur invalide pour ${this.modelPath}: attendu ${expectedDimension}, reçu ${vector.length}.`);
    }

    const input = new ort.Tensor("float32", Float32Array.from(vector), [1, vector.length]);
    return await session.run({ [inputName]: input });
  }

  getInputDimension(session?: ort.InferenceSession): number | null {
    const targetSession = session ?? this.session;
    const metadata = targetSession?.inputMetadata?.[0] as { shape?: number[] } | undefined;
    const shape = metadata?.shape;
    const dimension = Number(shape?.[1] ?? shape?.[0] ?? NaN);
    return Number.isFinite(dimension) ? dimension : null;
  }

  async getSession(): Promise<ort.InferenceSession> {
    if (!this.session) {
      this.session = await ort.InferenceSession.create(this.modelPath);
    }
    return this.session;
  }
}

export function asNumberArray(value: unknown): number[] {
  if (value instanceof Float32Array || value instanceof Int32Array || value instanceof Uint8Array) {
    return Array.from(value).map((entry) => Number(entry));
  }

  if (Array.isArray(value)) {
    return value.map((entry) => Number(entry));
  }

  if (value && typeof value === "object" && "length" in value) {
    const arrayLike = value as { length: number; [index: number]: number };
    return Array.from({ length: arrayLike.length }, (_, index) => Number(arrayLike[index] ?? 0));
  }

  if (typeof value === "number") {
    return [Number(value)];
  }

  return [];
}

export function asStringValue(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? "");
  }

  if (value && typeof value === "object" && "length" in value) {
    const arrayLike = value as { length: number; [index: number]: unknown };
    return String(arrayLike[0] ?? "");
  }

  return String(value ?? "");
}
