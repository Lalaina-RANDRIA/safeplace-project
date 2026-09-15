import type { UISummary } from "../types/ui";

export default function AnalysisSummary({ summary }: { summary: UISummary }) {
  return (
    <section className="space-y-1.5" aria-labelledby="analysis-summary-title">
      <h3 id="analysis-summary-title" className="text-[12px] font-bold text-ink m-0">
        {summary.title}
      </h3>
      <p className="text-[11px] text-[#5C6661] leading-relaxed m-0">
        {summary.message}
      </p>
    </section>
  );
}
