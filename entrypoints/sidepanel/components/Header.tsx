import React from "react";
import logoSafeplace from "../../../assets/logo_safeplace.png";

export default function Header() {
  return (
    <header className="app-header bg-brand-green text-white px-4 py-3.5 border-b border-hairline/20">
      <div className="header-top flex items-center justify-between">
        <div className="header-logo flex items-center gap-2.5">
          <div className="logo-icon-box w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 p-1 overflow-hidden">
            <img
              src={logoSafeplace}
              alt="SafePlace Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="logo-text">
            <h1 className="text-[15px] font-bold tracking-tight text-white m-0 leading-tight">
              SafePlace
            </h1>
            <p className="text-[11px] text-[#CBD3CE] font-normal m-0 leading-tight">
              Protection IA en ligne
            </p>
          </div>
        </div>

        {/* bouton parametre */}
        <button
          className="settings-btn w-8 h-8 rounded-full border border-white/20 text-[#CBD3CE] hover:text-white hover:border-white/40 hover:bg-white/10 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          id="settingsBtn"
          type="button"
          title="Paramètres de scan"
          aria-label="Paramètres de scan"
        >
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
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </header>
  );
}
