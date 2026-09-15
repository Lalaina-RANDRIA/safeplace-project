import { FileSearch } from "lucide-react";

export default function ExtractionState() {
  return (
    <section className="section-wrapper bg-white border border-hairline rounded-sm p-4 text-center shadow-subtle" aria-live="polite">
      <div className="flex justify-center py-2 text-brand-green" aria-hidden="true">
        <FileSearch className="w-7 h-7" strokeWidth={1.8} />
      </div>
      <h2 className="text-[13px] font-semibold text-ink m-0">Extraction du contenu</h2>
      <p className="text-[11px] text-[#5C6661] m-0 mt-1">SafePlace récupère le contenu de cette page…</p>
      <p className="text-[11px] text-[#5C6661] m-0 mt-0.5">Préparation de l'analyse…</p>
    </section>
  );
}
