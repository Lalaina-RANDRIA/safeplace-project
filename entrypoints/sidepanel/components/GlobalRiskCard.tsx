import type { UIAnalysisResult, UIGlobalRisk } from "../types/ui";
import { MODULE_STATUS_LABELS } from "./ModuleRiskCard";

const STATUS_LABELS: Record<UIGlobalRisk["status"], string> = {
  safe: "Sûr",
  low: "Risque faible",
  medium: "Risque modéré",
  high: "Risque élevé",
  critical: "Risque très élevé",
  unknown: "Résultat incertain",
  pending: "Analyse en cours",
  partial: "Résultat partiel",
};

function statusIcon(status: UIGlobalRisk["status"]): string {
  if (status === "safe" || status === "low") return "✓";
  if (status === "medium" || status === "high" || status === "critical") return "!";
  if (status === "pending") return "…";
  return "i";
}

function moduleStatusIcon(status: UIAnalysisResult["modules"][number]["status"]): string {
  if (status === "safe" || status === "low") return "✓";
  if (status === "medium" || status === "high" || status === "critical") return "!";
  if (status === "analyzing") return "…";
  return "i";
}

export default function GlobalRiskCard({ result }: { result: UIAnalysisResult }) {
  const { globalRisk: risk, modules } = result;
  const label = risk.label || STATUS_LABELS[risk.status];
  const resolvedModules = modules.filter(
    (module) => ["safe", "low", "medium", "high", "critical"].includes(module.status),
  ).length;
  const uncertainModules = modules.filter((module) => module.status === "unknown").length;
  const analysisCounts = [
    `${modules.length} domaine${modules.length === 1 ? "" : "s"} analysé${modules.length === 1 ? "" : "s"}`,
    ...(resolvedModules > 0
      ? [`${resolvedModules} résultat${resolvedModules === 1 ? "" : "s"} exploitable${resolvedModules === 1 ? "" : "s"}`]
      : []),
    ...(uncertainModules > 0 ? [`${uncertainModules} incertain${uncertainModules === 1 ? "" : "s"}`] : []),
  ].join(" · ");
  const analysisDescription = result.analysisStatus === "pending"
    ? "Les différents domaines sont en cours d'analyse."
    : result.analysisStatus === "partial"
      ? "Certains domaines n'ont pas fourni de résultat exploitable."
      : "SafePlace a analysé les quatre domaines séparément.";
  const globalDescription = result.analysisStatus === "pending"
    ? "Les différents domaines sont en cours d'analyse."
    : "Aucun score global commun n'est actuellement calculé.";

  return (
    <section
      className="risk-score-header pb-3 border-b border-hairline"
      aria-labelledby="global-risk-title"
      aria-describedby="global-risk-description"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="w-5 h-5 shrink-0 rounded-full border border-hairline bg-paper text-ink flex items-center justify-center text-[11px] font-bold"
          aria-hidden="true"
        >
          {statusIcon(risk.status)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="score-title flex items-baseline justify-between gap-2">
            <h3 id="global-risk-title" className="text-[12px] font-bold text-ink m-0">
              Risque global
            </h3>
            {risk.score !== undefined && (
              <span className="score-value font-mono text-[13px] font-bold text-ink">
                {Math.round(risk.score * 100)}%
              </span>
            )}
          </div>
          <p className="text-[12px] font-semibold text-ink m-0 mt-1">{label}</p>
          <p id="global-risk-description" className="text-[11px] text-[#5C6661] m-0 mt-0.5">
            {analysisDescription}
          </p>
          <p className="text-[11px] text-[#5C6661] m-0 mt-0.5">
            {globalDescription}
          </p>
          {result.analysisStatus !== "pending" && (
            <p className="text-[10.5px] text-[#5C6661] m-0 mt-1">
              {analysisCounts}
            </p>
          )}
          <div className="mt-2 space-y-1" aria-label="Synthèse des domaines analysés">
            {modules.map((module) => (
              <div key={module.id} className="flex items-center justify-between gap-2 text-[10.5px]">
                <span className="text-ink truncate">{module.label}</span>
                <span className="inline-flex items-center gap-1 text-[#5C6661] shrink-0">
                  <span aria-hidden="true">{moduleStatusIcon(module.status)}</span>
                  <span>{MODULE_STATUS_LABELS[module.status]}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
