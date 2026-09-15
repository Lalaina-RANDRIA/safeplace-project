import type { UIModuleId, UIRiskStatus } from "./ui";

/** Niveaux de risque déclenchant une protection utilisateur. */
export type ProtectionRiskLevel = Extract<
  UIRiskStatus,
  "medium" | "high" | "critical"
>;

/** Signal de risque exploitable par les composants de protection. */
export interface ModuleRiskSignal {
  moduleId: UIModuleId;
  moduleLabel: string;
  level: ProtectionRiskLevel;
}

/**
 * Identifiant du résultat affiché : sert d'état local de révélation, afin que
 * la protection reste toujours propre au résultat courant.
 */
export type ResultRevealKey = string;
