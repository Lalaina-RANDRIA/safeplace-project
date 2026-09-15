import { useMemo } from "react";
import type { UIModuleResult } from "../types/ui";
import { MODULE_STATUS_LABELS } from "./ModuleRiskCard";
import { selectRabbitHoleSignal } from "../utils/riskProtection";

/**
 * Sensibilisation Rabbit Hole : le contenu analysé reste entièrement visible,
 * seul un avertissement est affiché lorsque des signaux sont détectés.
 */
export default function RabbitHoleAlert({
  modules,
}: {
  modules: readonly UIModuleResult[];
}) {
  const signal = useMemo(() => selectRabbitHoleSignal(modules), [modules]);

  if (!signal) return null;

  return (
    <section
      className="rabbit-hole-alert flex items-start gap-2.5 rounded-sm border border-alert-amber/40 bg-seal-cream p-2.5"
      role="status"
      aria-live="polite"
      aria-labelledby="rabbit-hole-alert-title"
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-alert-amber/40 bg-white text-alert-amber"
        aria-hidden="true"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>

      <div className="min-w-0">
        <h3
          id="rabbit-hole-alert-title"
          className="m-0 text-[12px] font-bold text-ink"
        >
          Attention
        </h3>
        <p className="m-0 mt-0.5 text-[11px] leading-relaxed text-ink">
          Cette page présente des signaux pouvant favoriser un enfermement
          progressif dans une même chaîne de contenus ou de recommandations.
        </p>
        <p className="m-0 mt-0.5 text-[11px] leading-relaxed text-ink">
          Prenez du recul avant de poursuivre votre navigation.
        </p>
        <p className="m-0 mt-1 text-[10.5px] text-[#5C6661]">
          {signal.moduleLabel} — {MODULE_STATUS_LABELS[signal.level]}. Le contenu
          reste entièrement accessible.
        </p>
      </div>
    </section>
  );
}
