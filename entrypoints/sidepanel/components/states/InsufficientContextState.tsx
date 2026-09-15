import { CircleHelp } from "lucide-react";

export default function InsufficientContextState() {
  return (
    <section className="section-wrapper bg-white border border-hairline rounded-sm p-4 text-center shadow-subtle" aria-live="polite" aria-labelledby="insufficient-context-title">
      <div className="flex justify-center py-2 text-[#5C6661]" aria-hidden="true">
        <CircleHelp className="w-7 h-7" strokeWidth={1.8} />
      </div>
      <h2 id="insufficient-context-title" className="text-[13px] font-semibold text-ink m-0">Contexte insuffisant</h2>
      <p className="text-[11px] text-[#5C6661] m-0 mt-1">SafePlace n'a pas assez d'informations pour conclure.</p>
      <p className="text-[11px] text-[#5C6661] m-0 mt-0.5">Essayez d'analyser une page contenant davantage de contenu.</p>
    </section>
  );
}
