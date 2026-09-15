import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ResultRevealKey } from "../types/protection";
import type { UIModuleResult } from "../types/ui";
import { selectContentRiskSignals } from "../utils/riskProtection";
import ContentProtectionOverlay from "./ContentProtectionOverlay";

interface ProtectedContentProps {
  modules: readonly UIModuleResult[];
  resultKey: ResultRevealKey;
  children: ReactNode;
}

/**
 * Contenu analysé protégé par un voile lorsque la désinformation, l'arnaque ou
 * la toxicité atteignent un risque moyen ou plus.
 *
 * L'état de révélation est local au résultat affiché : il n'est ni global, ni
 * persisté, et se réinitialise dès que `resultKey` change.
 */
export default function ProtectedContent({
  modules,
  resultKey,
  children,
}: ProtectedContentProps) {
  const signals = useMemo(() => selectContentRiskSignals(modules), [modules]);
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldFocusContent = useRef(false);
  const [revealedKey, setRevealedKey] = useState<ResultRevealKey | null>(null);

  const isMasked = signals.length > 0 && revealedKey !== resultKey;

  useEffect(() => {
    if (isMasked || !shouldFocusContent.current) return;
    shouldFocusContent.current = false;
    contentRef.current?.focus();
  }, [isMasked]);

  const handleReveal = useCallback(() => {
    shouldFocusContent.current = true;
    setRevealedKey(resultKey);
  }, [resultKey]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        tabIndex={-1}
        aria-hidden={isMasked || undefined}
        inert={isMasked}
        className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {children}
      </div>

      {isMasked && (
        <ContentProtectionOverlay signals={signals} onReveal={handleReveal} />
      )}
    </div>
  );
}
