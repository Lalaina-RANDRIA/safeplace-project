import type { UIModuleId, UIModuleResult, UIModuleStatus } from "../types/ui";
import type { ModuleRiskSignal, ProtectionRiskLevel } from "../types/protection";

/** Modules dont un risque moyen ou plus masque le contenu analysé. */
export const CONTENT_MASKING_MODULE_IDS: readonly UIModuleId[] = [
  "fake-news",
  "scams",
  "toxicity",
];

/** Module d'enfermement algorithmique : ne masque jamais le contenu. */
export const RABBIT_HOLE_MODULE_ID: UIModuleId = "rabbit-hole";

const PROTECTION_RISK_LEVELS: readonly ProtectionRiskLevel[] = [
  "medium",
  "high",
  "critical",
];

function toProtectionRiskLevel(
  status: UIModuleStatus,
): ProtectionRiskLevel | undefined {
  return PROTECTION_RISK_LEVELS.find((level) => level === status);
}

function toRiskSignal(
  module: UIModuleResult,
  level: ProtectionRiskLevel,
): ModuleRiskSignal {
  return { moduleId: module.id, moduleLabel: module.label, level };
}

/** Signaux de risque des modules qui masquent le contenu analysé. */
export function selectContentRiskSignals(
  modules: readonly UIModuleResult[],
): ModuleRiskSignal[] {
  const signals: ModuleRiskSignal[] = [];

  for (const module of modules) {
    if (!CONTENT_MASKING_MODULE_IDS.includes(module.id)) continue;
    const level = toProtectionRiskLevel(module.status);
    if (level) signals.push(toRiskSignal(module, level));
  }

  return signals;
}

/** Signal de sensibilisation Rabbit Hole, s'il est déclenché. */
export function selectRabbitHoleSignal(
  modules: readonly UIModuleResult[],
): ModuleRiskSignal | undefined {
  const module = modules.find(
    (candidate) => candidate.id === RABBIT_HOLE_MODULE_ID,
  );
  if (!module) return undefined;

  const level = toProtectionRiskLevel(module.status);
  return level ? toRiskSignal(module, level) : undefined;
}
