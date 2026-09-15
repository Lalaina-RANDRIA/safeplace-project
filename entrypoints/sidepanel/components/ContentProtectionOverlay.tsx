import type { ModuleRiskSignal } from "../types/protection";
import { MODULE_STATUS_LABELS } from "./ModuleRiskCard";

interface ContentProtectionOverlayProps {
  signals: readonly ModuleRiskSignal[];
  onReveal: () => void;
}

/**
 * Voile opaque posé sur le contenu analysé : le texte reste dans le DOM mais
 * devient difficile à lire. L'utilisateur doit demander explicitement à
 * afficher le contenu.
 */
export default function ContentProtectionOverlay({
  signals,
  onReveal,
}: ContentProtectionOverlayProps) {
  return (
    <div className="content-protection-overlay absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-sm border border-alert-amber/40 bg-paper/90 backdrop-blur-[1.5px] p-3 text-center">
      <span
        className="w-6 h-6 shrink-0 rounded-full border border-alert-amber/40 bg-seal-cream text-alert-amber flex items-center justify-center"
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
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>

      <p className="text-[12px] font-bold text-ink m-0">Contenu masqué</p>
      <p className="text-[10.5px] font-semibold text-alert-amber m-0">
        Risque détecté
      </p>

      {signals.length > 0 && (
        <ul
          className="m-0 p-0 list-none text-[10.5px] text-[#5C6661] leading-snug"
          aria-label="Domaines à risque détectés"
        >
          {signals.map((signal) => (
            <li key={signal.moduleId}>
              {signal.moduleLabel} — {MODULE_STATUS_LABELS[signal.level]}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onReveal}
        className="mt-0.5 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-hairline bg-white text-ink text-[11px] font-semibold hover:bg-paper transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <svg
          className="w-3 h-3 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>Afficher le contenu</span>
      </button>
    </div>
  );
}
