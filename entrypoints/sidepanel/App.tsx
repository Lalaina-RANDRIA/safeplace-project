import { useEffect, useState } from "react";
import Header from "./components/Header";
import Body from "./components/Body";
import Footer from "./components/Footer";
import type { ExtractionResultForPanelMessage } from "../../types/extraction";
import type { ExtractionErrorMessage } from "../../types/extraction";
import type { Screen } from "../../types/navigation";
import type { AnalysisResultMessage } from "../../types/messaging";

function App() {
  const [screen, setScreen] = useState<Screen>({ status: "idle" });

  useEffect(() => {
    const handleMessage = (message: ExtractionResultForPanelMessage | ExtractionErrorMessage | AnalysisResultMessage) => {
      if (message.type === "EXTRACTION_RESULT_FOR_PANEL") {
        setScreen({ status: "result", data: message.payload });
      } else if (message.type === "ANALYSIS_RESULT") {
        setScreen((currentScreen) =>
          currentScreen.status === "result"
            ? { status: "result", data: currentScreen.data, analysis: message.payload }
            : currentScreen,
        );
      } else if (message.type === "EXTRACTION_ERROR") {
        setScreen({ status: "error", message: message.message });
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleAnalyze = async () => {
    setScreen({ status: "loading" });

    try {
      await browser.runtime.sendMessage({ type: "START_EXTRACTION" });
    } catch (reason) {
      console.error("[SafePlace][SidePanel] Failed to request extraction.", reason);
      setScreen({
        status: "error",
        message: reason instanceof Error ? reason.message : "Impossible d'extraire cette page.",
      });
    }
  };

  useEffect(() => {
    if (screen.status !== "loading") {
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
          onBack={() => setScreen({ status: "idle" })}
        />
      </main>
      <Footer />
    </div>
  );
}

export default App;
