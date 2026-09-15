import { GlobeX } from "lucide-react";

export default function UnsupportedPageState() {
  return (
    <section className="section-wrapper bg-white border border-hairline rounded-sm p-4 text-center shadow-subtle" aria-live="polite" aria-labelledby="unsupported-page-title">
      <div className="flex justify-center py-2 text-[#5C6661]" aria-hidden="true">
        <GlobeX className="w-7 h-7" strokeWidth={1.8} />
      </div>
      <h2 id="unsupported-page-title" className="text-[13px] font-semibold text-ink m-0">Page non analysable</h2>
      <p className="text-[11px] text-[#5C6661] m-0 mt-1">SafePlace ne peut pas accéder au contenu de cette page.</p>
      <p className="text-[11px] text-[#5C6661] m-0 mt-0.5">Essayez d'ouvrir une page web normale.</p>
    </section>
  );
}
