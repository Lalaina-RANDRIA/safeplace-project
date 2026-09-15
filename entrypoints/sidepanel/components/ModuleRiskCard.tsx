import type { UIModuleResult } from "../types/ui";

export const MODULE_STATUS_LABELS: Record<UIModuleResult["status"], string> = {
  safe: "Sûr",
  low: "Risque faible",
  medium: "Risque modéré",
  high: "Risque élevé",
  critical: "Risque très élevé",
  unknown: "Résultat incertain",
  pending: "Analyse en cours",
  partial: "Résultat partiel",
  insufficient_context: "Contexte insuffisant",
  not_available: "Non disponible",
  error: "Erreur",
  analyzing: "Analyse en cours",
};

const MODULE_ICONS: Record<UIModuleResult["id"], string> = {
  "fake-news": "▤",
  scams: "!",
  toxicity: "◆",
  "rabbit-hole": "∞",
};

function statusIcon(status: UIModuleResult["status"]): string {
  if (status === "safe" || status === "low") return "✓";
  if (status === "medium" || status === "high" || status === "critical") return "!";
  if (status === "analyzing") return "…";
  return "i";
}

export default function ModuleRiskCard({ module }: { module: UIModuleResult }) {
  return (
    <article className="risk-category flex items-start justify-between p-2.5 bg-paper/50 border border-hairline rounded-sm">
      <div className="risk-content flex-1 pr-2 min-w-0">
        <div className="risk-header flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12px] text-ink shrink-0" aria-hidden="true">
              {MODULE_ICONS[module.id]}
            </span>
            <span className="risk-name text-[12px] font-semibold text-ink truncate">
              {module.label}
            </span>
          </div>
          <span className="risk-badge text-[10.5px] font-semibold text-ink bg-white border border-hairline px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1 shrink-0">
            <span aria-hidden="true">{statusIcon(module.status)}</span>
            <span>{MODULE_STATUS_LABELS[module.status]}</span>
          </span>
        </div>
        <p className="risk-description text-[11px] text-[#5C6661] m-0">
          {module.explanation}
        </p>
        {module.score !== undefined && (
          <p className="text-[10px] text-[#5C6661] font-mono m-0 mt-1">
            Score : {module.score}
          </p>
        )}
      </div>
    </article>
  );
}
