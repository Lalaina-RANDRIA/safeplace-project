import { asNumberArray, asStringValue, OnnxModelRunner } from "../onnx/onnx-runner.ts";

export type MalagasyLanguage = "fr" | "en" | "mg" | "unknown";
export type MalagasyRouteTarget = "malagasy_plugin" | "native" | "unknown";

export interface MalagasyLanguageRoute {
  language: MalagasyLanguage;
  target: MalagasyRouteTarget;
}

export interface MalagasyTextSentiment {
  label: string;
  decisionScore: number;
  classScores: number[];
}

export const malagasyLanguageRouter = {
  detect(text: string): MalagasyLanguage {
    if (typeof text !== "string") {
      throw new TypeError("text doit être une chaîne de caractères.");
    }

    const tokens = text.toLowerCase().match(/\b[\wÀ-ÿ'-]+\b/g) ?? [];
    if (!tokens.length) {
      return "unknown";
    }

    const tokenSet = new Set(tokens);
    const frScore = [...tokenSet].filter((token) => FR_MARKERS.has(token)).length;
    const enScore = [...tokenSet].filter((token) => EN_MARKERS.has(token)).length;
    const mgScore = [...tokenSet].filter((token) => MG_MARKERS.has(token)).length;

    const scores: Record<MalagasyLanguage, number> = {
      fr: frScore,
      en: enScore,
      mg: mgScore,
      unknown: 0,
    };

    const bestLanguage = Object.entries(scores).reduce((best, current) => {
      const [language, score] = current;
      if (score > scores[best as MalagasyLanguage]) {
        return language as MalagasyLanguage;
      }
      return best;
    }, "unknown" as MalagasyLanguage);

    return scores[bestLanguage] === 0 ? "unknown" : bestLanguage;
  },

  route(text: string, language?: MalagasyLanguage): MalagasyLanguageRoute {
    const detectedLanguage = language ?? this.detect(text);

    if (detectedLanguage === "mg") {
      return { language: detectedLanguage, target: "malagasy_plugin" };
    }

    if (detectedLanguage === "fr" || detectedLanguage === "en") {
      return { language: detectedLanguage, target: "native" };
    }

    return { language: detectedLanguage, target: "unknown" };
  },
};

const FR_MARKERS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "est", "sont", "dans", "pour", "avec", "ce","cette",
  "ces", "que", "qui", "sur", "pas", "mais", "comme", "plus", "une",
]);

const EN_MARKERS = new Set([
  "the", "a", "an", "and", "is", "are", "was", "were", "of", "to", "for", "with", "this", "that", "in", "on",
  "not", "but", "more", "very",
]);

const MG_MARKERS = new Set([
  "ny", "dia", "izy", "ity", "ireo", "amin", "amin'ny", "ho", "fa", "tsy", "ary", "no", "ka", "ao", "be",
  "izany", "mety", "nataony", "mahafinaritra", "horonantsary", "governemanta",
]);

class MalagasyModelService {
  private readonly modelBaseUrl = new URL("../../../modules/rabbit-hole/models/", import.meta.url);

  async vectorizeText(text: string): Promise<number[]> {
    const runner = new OnnxModelRunner("malagasy_plugin.onnx", this.modelBaseUrl);
    const outputs = await runner.runText([text]);
    const firstOutput = outputs.variable;
    if (!firstOutput) {
      throw new Error("Le modèle Malagasy n’a pas produit de sortie variable.");
    }

    const values = asNumberArray(firstOutput.data);
    if (!values.length) {
      throw new Error("Le vecteur produit par le plugin Malagasy est vide.");
    }
    return values;
  }

  async syntheticClassifierVector(): Promise<number[]> {
    const runner = new OnnxModelRunner("malagasy_sentiment_classifier.onnx", this.modelBaseUrl);
    const session = await runner.getSession();
    const expectedDimension = runner.getInputDimension(session);
    if (expectedDimension === null) {
      throw new Error("Le modèle de classification Malagasy ne définit pas de dimension d’entrée valide.");
    }
    return new Array(expectedDimension).fill(0.1);
  }

  async analyzeText(text: string): Promise<MalagasyTextSentiment> {
    const runner = new OnnxModelRunner("malagasy_sentiment_model.onnx", this.modelBaseUrl);
    const outputs = await runner.runText([text]);

    const label = asStringValue(outputs.label?.data);
    const decision = asNumberArray(outputs.decision_score?.data);
    const classScores = asNumberArray(outputs.class_scores?.data);

    return {
      label,
      decisionScore: Number(decision[0] ?? 0),
      classScores: classScores.slice(0, 2),
    };
  }

  async classifyTfIdf(vector: number[]): Promise<MalagasyTextSentiment> {
    const runner = new OnnxModelRunner("malagasy_sentiment_classifier.onnx", this.modelBaseUrl);
    const outputs = await runner.runVector(vector);

    const label = asStringValue(outputs.label?.data);
    const decision = asNumberArray(outputs.decision_score?.data);
    const classScores = asNumberArray(outputs.class_scores?.data);

    return {
      label,
      decisionScore: Number(decision[0] ?? 0),
      classScores: classScores.slice(0, 2),
    };
  }
}

export const malagasyMlService = new MalagasyModelService();
export default malagasyMlService;
