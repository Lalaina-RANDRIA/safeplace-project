import type { UIAnalysisResult } from "../types/ui";
import AnalysisSummary from "./AnalysisSummary";
import GlobalRiskCard from "./GlobalRiskCard";
import ModuleRiskCard from "./ModuleRiskCard";

export default function ResultScreen({ result }: { result: UIAnalysisResult }) {
  return (
    <div className="risk-section space-y-3" aria-label="Résultats de l'analyse">
      <GlobalRiskCard result={result} />

      <div className="risk-categories space-y-2">
        {result.modules.map((module) => (
          <ModuleRiskCard key={module.id} module={module} />
        ))}
      </div>

      <AnalysisSummary summary={result.summary} />
    </div>
  );
}
