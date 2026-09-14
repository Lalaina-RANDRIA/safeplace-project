import React from "react";
import logoSafeplace from "../../../assets/logo_safeplace.png";
import type { Screen } from "../../../types/navigation";

interface BodyProps {
  onAnalyze: () => Promise<void>;
  onBack: () => void;
  screen: Screen;
}

export default function Body({ onAnalyze, onBack, screen }: BodyProps) {
  const showHome = screen.status === "idle";
  const showLoading = screen.status === "loading";
  const showResult = screen.status === "result";
  const showError = screen.status === "error";

  return (
    <div className="main-content p-3.5 space-y-3.5 text-ink">
      {/* Status & Filter Section */}
      <section id="statusSection" className={`${showHome ? "" : "hidden "}section-wrapper space-y-3`}>
        {/* Status Card / Control Panel */}
        <div className="status-card bg-white border border-hairline rounded-sm p-3.5 shadow-subtle">
          {/* Status Header with Seal Badge */}
          <div className="status-header flex items-center justify-between pb-3 mb-3 border-b border-hairline">
            <span className="status-label text-[12px] font-bold text-ink tracking-tight">
              Filtres d'inspection
            </span>
            {/* Sceau officiel "Prêt à analyser" */}
            <span className="status-indicator inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-seal-cream text-brand-green border border-brand-green/20 text-[11px] font-semibold tracking-normal shadow-xs">
              <svg
                className="w-3 h-3 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Prêt à analyser</span>
            </span>
          </div>

          {/* Scan Filters - Left color-coded borders & toggles */}
          <div className="scan-filters space-y-2 mb-3.5">
            {/* 1. Désinformation -> Ink */}
            <div className="filter-item flex items-center justify-between p-2.5 bg-paper/60 border border-hairline border-l-4 border-l-ink rounded-sm hover:bg-paper/90 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="checkbox-icon text-ink flex items-center justify-center w-5 h-5 shrink-0">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                    <path d="M18 14h-8" />
                    <path d="M15 18h-5" />
                    <path d="M10 6h8v4h-8V6Z" />
                  </svg>
                </span>
                <label htmlFor="filterFakeNews" className="filter-label text-[12.5px] font-medium text-ink cursor-pointer">
                  Désinformation
                </label>
              </div>

              {/* Checkbox */}
              <input
                type="checkbox"
                id="filterFakeNews"
                name="fakeNews"
                defaultChecked
                className="w-4 h-4 accent-trust-green rounded-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
            </div>

            {/* 2. Arnaque/Fraude -> Alert Amber */}
            <div className="filter-item flex items-center justify-between p-2.5 bg-paper/60 border border-hairline border-l-4 border-l-alert-amber rounded-sm hover:bg-paper/90 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="checkbox-icon text-alert-amber flex items-center justify-center w-5 h-5 shrink-0">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
                <label htmlFor="filterScam" className="filter-label text-[12.5px] font-medium text-ink cursor-pointer">
                  Arnaque/Fraude
                </label>
              </div>

              {/* Checkbox */}
              <input
                type="checkbox"
                id="filterScam"
                name="scam"
                defaultChecked
                className="w-4 h-4 accent-trust-green rounded-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alert-amber"
              />
            </div>

            {/* 3. Toxicité -> Danger Red */}
            <div className="filter-item flex items-center justify-between p-2.5 bg-paper/60 border border-hairline border-l-4 border-l-danger-red rounded-sm hover:bg-paper/90 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="checkbox-icon text-danger-red flex items-center justify-center w-5 h-5 shrink-0">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" />
                  </svg>
                </span>
                <label htmlFor="filterToxicity" className="filter-label text-[12.5px] font-medium text-ink cursor-pointer">
                  Toxicité
                </label>
              </div>

              {/* Checkbox */}
              <input
                type="checkbox"
                id="filterToxicity"
                name="toxicity"
                defaultChecked
                className="w-4 h-4 accent-trust-green rounded-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-red"
              />
            </div>

            {/* 4. Rabbit Hole -> Trust Green */}
            <div className="filter-item flex items-center justify-between p-2.5 bg-paper/60 border border-hairline border-l-4 border-l-trust-green rounded-sm hover:bg-paper/90 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="checkbox-icon text-trust-green flex items-center justify-center w-5 h-5 shrink-0">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
                  </svg>
                </span>
                <label htmlFor="filterRabbitHole" className="filter-label text-[12.5px] font-medium text-ink cursor-pointer">
                  Rabbit Hole
                </label>
              </div>

              {/* Checkbox */}
              <input
                type="checkbox"
                id="filterRabbitHole"
                name="rabbitHole"
                defaultChecked
                className="w-4 h-4 accent-trust-green rounded-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-trust-green"
              />
            </div>
          </div>

          {/* Action Button: Flat ink, no gradient, no magnifying glass icon, active voice */}
          <button
            className="analyze-btn w-full bg-brand-green hover:bg-[#175E32] active:bg-[#124C29] text-white py-3 px-4 rounded-sm font-semibold text-[13.5px] transition-colors border border-brand-green shadow-xs flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            id="analyzeBtn"
            type="button"
            onClick={() => void onAnalyze()}
          >
            <span>Lancer l'analyse</span>
          </button>
        </div>
      </section>

      {/* Analysis Loading State */}
      <div
        id="loadingState"
        className={`${showLoading ? "" : "hidden "}section-wrapper bg-white border border-hairline rounded-sm p-4 text-center shadow-subtle`}
      >
        <div className="loading-card space-y-3">
          <div className="loading-spinner flex justify-center py-2">
            <div className="w-7 h-7 border-2 border-hairline border-t-brand-green rounded-full animate-spin"></div>
          </div>
          <div>
            <p className="loading-text text-[13px] font-semibold text-ink m-0">
              Analyse en cours...
            </p>
            <p className="loading-subtext text-[11px] text-[#5C6661] m-0 mt-0.5">
              Vérification de l'intégrité du contenu de la page
            </p>
          </div>
          <div className="progress-bar-wrapper w-full bg-paper border border-hairline rounded-full overflow-hidden h-1.5">
            <div className="progress-bar h-full bg-brand-green animate-pulse w-3/5"></div>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      <div
        id="resultsSection"
        className={`${showResult ? "" : "hidden "}section-wrapper bg-white border border-hairline rounded-sm p-3.5 space-y-3.5 shadow-subtle`}
      >
        {screen.status === "result" && (
          <>
            {/* Métadonnées de la page */}
            <div className="space-y-2 pb-3 border-b border-hairline">
              <div className="flex items-start gap-2">
                <span className="text-[10.5px] font-semibold text-ink shrink-0 mt-0.5 w-16">Titre</span>
                <span className="text-[11px] text-ink leading-snug">{screen.data.title || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[10.5px] font-semibold text-ink shrink-0 mt-0.5 w-16">URL</span>
                <a
                  href={screen.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-brand-green underline underline-offset-2 truncate max-w-[180px]"
                  title={screen.data.url}
                >
                  {screen.data.domain}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[10.5px] font-semibold text-ink shrink-0 mt-0.5 w-16">Méthode</span>
                <span className="text-[11px] text-[#5C6661] font-mono">{screen.data.extractionMethod}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[10.5px] font-semibold text-ink shrink-0 mt-0.5 w-16">Extrait le</span>
                <span className="text-[11px] text-[#5C6661]">
                  {new Date(screen.data.extractedAt).toLocaleString("fr-FR")}
                </span>
              </div>
            </div>

            {/* Texte extrait */}
            {screen.data.text && (
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-semibold text-ink">
                  Texte extrait{" "}
                  <span className="font-normal text-[#5C6661]">({screen.data.text.length} caractères)</span>
                </span>
                <div className="bg-paper border border-hairline rounded-sm p-2.5 max-h-36 overflow-y-auto">
                  <p className="text-[11px] text-ink leading-relaxed whitespace-pre-wrap m-0">
                    {screen.data.text}
                  </p>
                </div>
              </div>
            )}

            {/* Liens extraits */}
            {screen.data.links.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-semibold text-ink">
                  Liens externes{" "}
                  <span className="font-normal text-[#5C6661]">({screen.data.links.length})</span>
                </span>
                <div className="bg-paper border border-hairline rounded-sm p-2.5 max-h-28 overflow-y-auto space-y-1.5">
                  {screen.data.links.map((link, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-brand-green underline underline-offset-1 truncate"
                        title={link.href}
                      >
                        {link.text || link.href}
                      </a>
                      {link.text && (
                        <span className="text-[10px] text-[#5C6661] truncate">{link.href}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="w-full border border-hairline bg-paper text-ink py-2 px-4 rounded-sm font-semibold text-[12px]"
              type="button"
              onClick={onBack}
            >
              Nouvelle analyse
            </button>
          </>
        )}
        <div className="risk-section space-y-3">
          {/* Risk Score Header */}
          <div className="risk-score-header pb-3 border-b border-hairline">
            <div className="score-title flex justify-between items-baseline mb-1.5">
              <span className="text-[12px] font-bold text-ink">
                Score de risque global
              </span>
              <span
                className="score-value font-mono text-[13px] font-bold text-ink"
                id="riskScore"
              >
                -
              </span>
            </div>
            <div className="score-bar-wrapper flex items-center gap-2">
              <div className="score-bar flex-1 bg-paper border border-hairline rounded-full h-2 overflow-hidden">
                <div
                  id="riskBar"
                  className="score-bar-fill h-full bg-trust-green transition-all duration-300"
                  style={{ width: "0%" }}
                ></div>
              </div>
              <span className="score-percentage font-mono text-[10.5px] text-[#5C6661] shrink-0">
                0%
              </span>
            </div>
          </div>

          {/* Risk Categories List */}
          <div className="risk-categories space-y-2">
            {/* Fake News */}
            <div className="risk-category flex items-start justify-between p-2.5 bg-paper/50 border border-hairline border-l-4 border-l-ink rounded-sm">
              <div className="risk-content flex-1 pr-2">
                <div className="risk-header flex items-center justify-between mb-0.5">
                  <span className="risk-name text-[12px] font-semibold text-ink">
                    Désinformation
                  </span>
                  <span
                    id="fakeNewsRisk"
                    className="risk-badge badge-safe text-[10.5px] font-semibold text-trust-green bg-trust-green/10 border border-trust-green/20 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1"
                  >
                    <span>Sûr</span>
                  </span>
                </div>
                <p className="risk-description text-[11px] text-[#5C6661] m-0">
                  Absence de contenu suspect
                </p>
              </div>
            </div>

            {/* Scam */}
            <div className="risk-category flex items-start justify-between p-2.5 bg-paper/50 border border-hairline border-l-4 border-l-alert-amber rounded-sm">
              <div className="risk-content flex-1 pr-2">
                <div className="risk-header flex items-center justify-between mb-0.5">
                  <span className="risk-name text-[12px] font-semibold text-ink">
                    Arnaque/Fraude
                  </span>
                  <span
                    id="scamRisk"
                    className="risk-badge badge-safe text-[10.5px] font-semibold text-trust-green bg-trust-green/10 border border-trust-green/20 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1"
                  >
                    <span>Sûr</span>
                  </span>
                </div>
                <p className="risk-description text-[11px] text-[#5C6661] m-0">
                  Aucun indicateur de fraude détecté
                </p>
              </div>
            </div>

            {/* Toxicity */}
            <div className="risk-category flex items-start justify-between p-2.5 bg-paper/50 border border-hairline border-l-4 border-l-danger-red rounded-sm">
              <div className="risk-content flex-1 pr-2">
                <div className="risk-header flex items-center justify-between mb-0.5">
                  <span className="risk-name text-[12px] font-semibold text-ink">
                    Toxicité
                  </span>
                  <span
                    id="toxicityRisk"
                    className="risk-badge badge-safe text-[10.5px] font-semibold text-trust-green bg-trust-green/10 border border-trust-green/20 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1"
                  >
                    <span>Sûr</span>
                  </span>
                </div>
                <p className="risk-description text-[11px] text-[#5C6661] m-0">
                  Contenu respectueux et équilibré
                </p>
              </div>
            </div>

            {/* Rabbit Hole */}
            <div className="risk-category flex items-start justify-between p-2.5 bg-paper/50 border border-hairline border-l-4 border-l-trust-green rounded-sm">
              <div className="risk-content flex-1 pr-2">
                <div className="risk-header flex items-center justify-between mb-0.5">
                  <span className="risk-name text-[12px] font-semibold text-ink">
                    Rabbit Hole
                  </span>
                  <span
                    id="rabbitHoleRisk"
                    className="risk-badge badge-safe text-[10.5px] font-semibold text-trust-green bg-trust-green/10 border border-trust-green/20 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1"
                  >
                    <span>Exempté</span>
                  </span>
                </div>
                <p className="risk-description text-[11px] text-[#5C6661] m-0">
                  Contenu diversifié et équilibré
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons grid grid-cols-2 gap-2 pt-1">
          <button
            className="action-btn report-btn w-full py-2 px-3 border border-hairline bg-paper hover:bg-[#E5EAE7] text-ink font-medium text-[11.5px] rounded-sm transition-colors text-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            id="reportBtn"
            type="button"
          >
            Signaler
          </button>
          <button
            className="action-btn learn-btn w-full py-2 px-3 border border-hairline bg-paper hover:bg-[#E5EAE7] text-ink font-medium text-[11.5px] rounded-sm transition-colors text-center focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            id="learnMoreBtn"
            type="button"
          >
            En savoir plus
          </button>
        </div>
      </div>

      {showError && (
        <section className="section-wrapper bg-white border border-hairline rounded-sm p-4 text-center shadow-subtle">
          <p className="text-[13px] font-semibold text-danger-red">Analyse impossible</p>
          <p className="text-[11px] text-[#5C6661] mt-1">{screen.message}</p>
          <button
            className="mt-3 w-full bg-brand-green text-white py-2 px-4 rounded-sm font-semibold text-[12px]"
            type="button"
            onClick={() => void onAnalyze()}
          >
            Réessayer
          </button>
        </section>
      )}

      {/* Recent Scans Section */}
      <section className={`${showHome ? "" : "hidden "}section-wrapper bg-white border border-hairline rounded-sm p-3.5 shadow-subtle space-y-2.5`}>
        <div className="section-title-wrapper flex items-center justify-between pb-2 border-b border-hairline">
          <h3 className="section-title text-[12px] font-bold text-ink m-0 tracking-tight">
            Analyses récentes
          </h3>
          <button
            className="clear-scans-btn w-6 h-6 flex items-center justify-center rounded-sm text-[#5C6661] hover:text-danger-red hover:bg-paper transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            id="clearScansBtn"
            type="button"
            title="Supprimer l'historique"
            aria-label="Supprimer l'historique"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>

        {/* Dynamic list container */}
        <div id="recentScans" className="space-y-1.5">
          {/* Dynamic items populate here */}
        </div>

        {/* Empty State - Clear Invitation to Act */}
        <div
          id="emptyScans"
          className="empty-state border border-dashed border-[#C4CCC7] bg-paper/40 rounded-sm p-3.5 text-center"
        >
          <div className="empty-icon w-8 h-8 mx-auto mb-2 rounded-sm bg-white border border-hairline flex items-center justify-center p-1">
            <img
              src={logoSafeplace}
              alt="SafePlace Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="empty-title text-[12px] font-semibold text-ink m-0">
            Prêt pour une première inspection
          </p>
          <p className="empty-subtitle text-[11px] text-[#5C6661] m-0 mt-1 leading-relaxed">
            Activez les filtres souhaités puis lancez l'analyse pour vérifier
            l'intégrité de cette page.
          </p>
        </div>
      </section>
    </div>
  );
}
