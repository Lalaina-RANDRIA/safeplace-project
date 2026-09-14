import React from "react";
import IspmLogo from "./ispm-logo";

export default function Footer() {
  return (
    <footer className="app-footer bg-white border-t border-hairline px-4 py-2.5 text-center mt-auto">
      {/* Logo ispm */}
      <div className="pb-2">
        <IspmLogo />
      </div>
      {/* ligne en bas */}
      <div className="w-28 mx-auto border-b border-hairline" />

      <div className="pt-2 flex items-center justify-center flex-wrap gap-1.5 text-[11px] text-[#5C6661]">
        <span className="font-semibold text-ink">SafePlace</span>
        <span className="text-[#AAB3AE]" aria-hidden="true">
          •
        </span>
        <a
          href="#"
          className="hover:text-ink hover:underline underline-offset-2 transition-colors focus-visible:outline-1 focus-visible:outline-ink"
        >
          Conditions d'utilisation
        </a>
        <span className="text-[#AAB3AE]" aria-hidden="true">
          •
        </span>
        <a
          href="#"
          className="hover:text-ink hover:underline underline-offset-2 transition-colors focus-visible:outline-1 focus-visible:outline-ink"
        >
          Confidentialité
        </a>
      </div>
    </footer>
  );
}
