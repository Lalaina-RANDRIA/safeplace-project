import { CircleAlert } from "lucide-react";

interface ErrorStateProps {
  onRetry: () => Promise<void>;
}

export default function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <section className="section-wrapper bg-white border border-hairline rounded-sm p-4 text-center shadow-subtle" aria-live="polite" aria-labelledby="error-title">
      <div className="flex justify-center py-2 text-danger-red" aria-hidden="true">
        <CircleAlert className="w-7 h-7" strokeWidth={1.8} />
      </div>
      <h2 id="error-title" className="text-[13px] font-semibold text-danger-red m-0">Analyse impossible</h2>
      <p className="text-[11px] text-[#5C6661] m-0 mt-1">SafePlace n'a pas pu terminer l'analyse de cette page.</p>
      <button
        className="mt-3 w-full bg-brand-green text-white py-2 px-4 rounded-sm font-semibold text-[12px]"
        type="button"
        onClick={() => void onRetry()}
      >
        Réessayer
      </button>
    </section>
  );
}
