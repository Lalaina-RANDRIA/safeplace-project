import { useEffect, useState } from "react";
import Header from "./components/Header";
import Body from "./components/Body";
import Footer from "./components/Footer";
import type { ExtractionResultForPanelMessage } from "../../types/extraction";
import type { ExtractionErrorMessage } from "../../types/extraction";
import type { Screen } from "../../types/navigation";
import type { AnalysisResultMessage } from "../../types/messaging";
import { analysisToUi } from "./adapters/analysisToUi";

const SAFEPLACE_DEBUG = true;

function createAnalysisId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `SP-${stamp}-${Math.random().toString(16).slice(2, 8)}`;
}

function debugLog(step: string, analysisId: string, message: string, detail?: Record<string, unknown>): void {
  if (!SAFEPLACE_DEBUG) return;
  const base = `[SafePlace][SidePanel][${step}][${analysisId}] ${message}`;
  if (detail && Object.keys(detail).length > 0) {
    console.log(base, detail);
    return;
  }
  console.log(base);
}

function App() {
  const [screen, setScreen] = useState<Screen>({ status: "idle" });

  useEffect(() => {
    setScreen({ status: "ready" });
  }, []);

  useEffect(() => {
    const handleMessage = (message: ExtractionResultForPanelMessage | ExtractionErrorMessage | AnalysisResultMessage) => {
      const analysisId = "debugAnalysisId" in message ? message.debugAnalysisId ?? "unknown" : "unknown";

      if (message.type === "EXTRACTION_RESULT_FOR_PANEL") {
        debugLog("RESULT", analysisId, "EXTRACTION_RESULT_FOR_PANEL reçu");
        debugLog("STATE", analysisId, "EXTRACTING → ANALYZING");
        setScreen({
          status: "analyzing",
          data: message.payload,
          ui: analysisToUi(message.payload),
        });
      } else if (message.type === "ANALYSIS_RESULT") {
        debugLog("RESULT", analysisId, "ANALYSIS_RESULT reçu");
        setScreen((currentScreen) =>
          currentScreen.status === "analyzing"
            ? (() => {
                const ui = analysisToUi(currentScreen.data, message.payload);
                const status = ui.analysisStatus === "partial" ? "partial_result" : "result";
                debugLog("STATE", analysisId, `ANALYZING → ${status.toUpperCase()}`);
                return { status, data: currentScreen.data, analysis: message.payload, ui };
              })()
            : currentScreen,
        );
      } else if (message.type === "EXTRACTION_ERROR") {
        debugLog("ERROR", analysisId, "EXTRACTION_ERROR reçu", { message: message.message, code: message.code });
        const status = message.code === "UNSUPPORTED_PAGE" ? "unsupported_page" : "error";
        setScreen((currentScreen) => {
          debugLog("STATE", analysisId, `${currentScreen.status.toUpperCase()} → ${status.toUpperCase()}`);
          return { status, message: message.message };
        });
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleAnalyze = async () => {
    const analysisId = createAnalysisId();
    setScreen({ status: "extracting" });
    debugLog("STATE", analysisId, "READY → EXTRACTING");
    debugLog("START", analysisId, "START_EXTRACTION envoyé");

    try {
      await browser.runtime.sendMessage({ type: "START_EXTRACTION", debugAnalysisId: analysisId });
      debugLog("END", analysisId, "Demande START_EXTRACTION acceptée");
    } catch (reason) {
      const messageText = reason instanceof Error ? reason.message : String(reason ?? "");
      debugLog("ERROR", analysisId, "Échec demande extraction", {
        errorName: reason instanceof Error ? reason.name : "UnknownError",
        errorMessage: messageText,
      });
      console.error("[SafePlace][SidePanel] Failed to request extraction.", reason);
      debugLog("STATE", analysisId, "EXTRACTING → ERROR");
      setScreen({
        status: "error",
        message: reason instanceof Error ? reason.message : "Impossible d'extraire cette page.",
      });
    }
  };

  useEffect(() => {
    if (screen.status !== "extracting") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setScreen({
        status: "error",
        message: "La page n'a pas répondu à la demande d'extraction.",
      });
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [screen.status]);

  return (
    <div className="app-container min-h-screen bg-paper text-ink font-sans flex flex-col antialiased">
      <Header />
      <main className="flex-1 flex flex-col">
        <Body
          screen={screen}
          onAnalyze={handleAnalyze}
          onBack={() => setScreen({ status: "ready" })}
        />
      </main>
      <Footer />
    </div>
  );
}

export default App;
