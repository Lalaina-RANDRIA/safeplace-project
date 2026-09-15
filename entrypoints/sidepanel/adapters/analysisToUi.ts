import type { AnalysisResponse, ModuleAnalysisResult } from "../../../types/analysis";
import type { ExtractionPayload } from "../../../types/extraction";
import type {
  UIAnalysisResult,
  UIContextStatus,
  UIModuleId,
  UIModuleResult,
  UIRiskStatus,
} from "../types/ui";

const MODULE_LABELS: Record<UIModuleId, string> = {
  "fake-news": "Désinformation",
  scams: "Arnaque/Fraude",
  toxicity: "Toxicité",
  "rabbit-hole": "Rabbit Hole",
};

const MODULE_KEYS: Array<{ id: UIModuleId; key: keyof AnalysisResponse }> = [
  { id: "fake-news", key: "fakeNews" },
  { id: "scams", key: "scams" },
  { id: "toxicity", key: "toxicity" },
  { id: "rabbit-hole", key: "rabbitHole" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readData(result: ModuleAnalysisResult): Record<string, unknown> | undefined {
  return result.status === "success" && isRecord(result.data) ? result.data : undefined;
}

function statusFromVerdict(verdict: string | undefined, moduleId: UIModuleId): UIRiskStatus {
  if (!verdict) return moduleId === "rabbit-hole" ? "unknown" : "unknown";

  switch (verdict) {
    case "SUPPORTED":
    case "LOW_RISK":
      return "safe";
    case "REFUTED":
    case "HIGH_RISK":
      return "high";
    case "MEDIUM_RISK":
      return "medium";
    case "CRITICAL_RISK":
      return "critical";
    case "UNCERTAIN":
      return "medium";
    case "NOT_ENOUGH_INFO":
    case "UNKNOWN":
      return moduleId === "rabbit-hole" ? "unknown" : "unknown";
    default:
      return "unknown";
  }
}

function createPendingModule(id: UIModuleId): UIModuleResult {
  return {
    id,
    label: MODULE_LABELS[id],
    status: "analyzing",
    explanation: "Analyse en cours...",
  };
}

function explanationFromResult(
  id: UIModuleId,
  verdict: string | undefined,
  data: Record<string, unknown>,
): string {
  if (verdict === "UNKNOWN" && id === "scams") {
    return "Aucun signal d'arnaque n'a été détecté, mais le moteur ne permet pas de conclure à l'absence de risque.";
  }

  if (verdict === "UNKNOWN" && id === "rabbit-hole") {
    return "Le moteur n'a pas pu établir une conclusion fiable.";
  }

  return readString(data, "explanation") ?? "Résultat disponible.";
}

function createModuleResult(id: UIModuleId, result: ModuleAnalysisResult): UIModuleResult {
  if (result.status === "error") {
    return {
      id,
      label: MODULE_LABELS[id],
      status: "error",
      explanation: result.message,
      details: {
        errorMessage: result.message,
        errorCode: result.errorCode,
      },
    };
  }

  const data = readData(result);
  if (!data) {
    return {
      id,
      label: MODULE_LABELS[id],
      status: "not_available",
      explanation: "Résultat indisponible.",
    };
  }

  const verdict = readString(data, id === "fake-news" ? "overallVerdict" : "verdict");
  const explanation = explanationFromResult(id, verdict, data);
  const score = readNumber(data, id === "fake-news" ? "overallScore" : "score");

  return {
    id,
    label: MODULE_LABELS[id],
    status: statusFromVerdict(verdict, id),
    ...(score === undefined ? {} : { score }),
    explanation,
    details: { raw: data },
  };
}

function contextFromModules(modules: UIModuleResult[]): { status: UIContextStatus; label: string } {
  if (modules.some((module) => module.status === "error" || module.status === "analyzing")) {
    return { status: "partial", label: "Analyse partielle" };
  }

  if (modules.some((module) => module.status === "unknown" || module.status === "insufficient_context")) {
    return { status: "insufficient", label: "Contexte insuffisant" };
  }

  if (modules.length === 0) {
    return { status: "unknown", label: "Contexte inconnu" };
  }

  return { status: "sufficient", label: "Contexte disponible" };
}

function summaryFromModules(modules: UIModuleResult[], analysisStatus: UIAnalysisResult["analysisStatus"]): UIAnalysisResult["summary"] {
  if (analysisStatus === "pending") {
    return { title: "Analyse en cours", message: "SafePlace vérifie les signaux de la page." };
  }

  if (analysisStatus === "partial") {
    return { title: "Résultat partiel", message: "Certains éléments n'ont pas pu être vérifiés." };
  }

  const riskyModules = modules.filter((module) => ["medium", "high", "critical"].includes(module.status));
  if (riskyModules.length > 0) {
    return {
      title: "Signaux à examiner",
      message: `${riskyModules.length} domaine(s) présente(nt) des signaux nécessitant une vérification.`,
    };
  }

  if (modules.some((module) => module.status === "unknown" || module.status === "insufficient_context")) {
    return { title: "Contexte insuffisant", message: "SafePlace n'a pas assez de contexte pour conclure." };
  }

  return { title: "Aucun signal important", message: "Aucun signal important n'a été détecté." };
}

export function analysisToUi(extraction: ExtractionPayload, analysis?: AnalysisResponse): UIAnalysisResult {
  const modules = analysis
    ? MODULE_KEYS.map(({ id, key }) => createModuleResult(id, analysis[key]))
    : MODULE_KEYS.map(({ id }) => createPendingModule(id));
  const analysisStatus = analysis
    ? modules.some((module) => module.status === "error" || module.status === "not_available")
      ? "partial"
      : "complete"
    : "pending";
  const context = contextFromModules(modules);

  return {
    page: {
      title: extraction.title,
      url: extraction.url,
      domain: extraction.domain,
      extractionMethod: extraction.extractionMethod,
      extractedAt: extraction.extractedAt,
    },
    globalRisk: {
      status: analysis ? (analysisStatus === "partial" ? "partial" : "unknown") : "pending",
      label: analysis ? (analysisStatus === "partial" ? "Résultat partiel" : "Résultat global indisponible") : "Analyse en cours",
      explanation: analysis
        ? "Le backend ne fournit pas encore de score global commun aux quatre domaines."
        : "Les résultats des quatre domaines sont en cours de réception.",
    },
    summary: summaryFromModules(modules, analysisStatus),
    modules,
    context,
    details: { modules },
    extractedContent: {
      text: extraction.text,
      links: extraction.links,
      characterCount: extraction.text.length,
    },
    analysisStatus,
  };
}
