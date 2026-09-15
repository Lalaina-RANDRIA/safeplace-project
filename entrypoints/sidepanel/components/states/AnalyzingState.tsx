import { ScanSearch } from "lucide-react";
import type { UIAnalysisResult } from "../../types/ui";

export default function AnalyzingState({ result }: { result: UIAnalysisResult }) {
  const completedModules = result.modules.filter((module) => module.status !== "analyzing").length;
  const hasModuleUpdate = completedModules > 0;

  return (
    <section className="section-wrapper bg-white border border-hairline rounded-sm p-4 text-center shadow-subtle" aria-live="polite">
      <div className="flex justify-center py-2 text-brand-green" aria-hidden="true">
        <ScanSearch className="w-7 h-7 animate-pulse" strokeWidth={1.8} />
      </div>
      <h2 className="text-[13px] font-semibold text-ink m-0">Analyse en cours…</h2>
      <p className="text-[11px] text-[#5C6661] m-0 mt-1">SafePlace examine les différents aspects de cette page.</p>
      {hasModuleUpdate && (
        <p className="text-[10.5px] text-[#5C6661] m-0 mt-2">
          {completedModules} domaine{completedModules === 1 ? "" : "s"} déjà examiné{completedModules === 1 ? "" : "s"}
        </p>
      )}
    </section>
  );
}
