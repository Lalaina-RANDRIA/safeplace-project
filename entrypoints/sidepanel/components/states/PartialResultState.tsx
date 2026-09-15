import { Info } from "lucide-react";
import type { UIAnalysisResult } from "../../types/ui";
import ResultScreen from "../ResultScreen";

export default function PartialResultState({ result }: { result: UIAnalysisResult }) {
  return (
    <div className="space-y-3" aria-live="polite">
      <section className="border border-hairline bg-paper rounded-sm p-2.5 flex items-start gap-2" aria-labelledby="partial-result-title">
        <Info className="w-4 h-4 shrink-0 text-[#5C6661] mt-0.5" aria-hidden="true" />
        <div>
          <h2 id="partial-result-title" className="text-[12px] font-semibold text-ink m-0">Résultat partiel</h2>
          <p className="text-[11px] text-[#5C6661] m-0 mt-0.5">SafePlace a terminé une partie de l'analyse. Certains domaines n'ont pas fourni de résultat exploitable.</p>
        </div>
      </section>
      <ResultScreen result={result} />
    </div>
  );
}
