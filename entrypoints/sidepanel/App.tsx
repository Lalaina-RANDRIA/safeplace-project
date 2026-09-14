import { useEffect, useState } from "react";
import Header from "./components/Header";
import Body from "./components/Body";
import Footer from "./components/Footer";
import type { ExtractionResultForPanelMessage } from "../../types/extraction";
import type { Screen } from "../../types/navigation";

function App() {
  const [screen, setScreen] = useState<Screen>({ status: "idle" });

  useEffect(() => {
    const handleMessage = (message: ExtractionResultForPanelMessage) => {
      if (message.type === "EXTRACTION_RESULT_FOR_PANEL") {
        setScreen({ status: "result", data: message.payload });
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleAnalyze = async () => {
    setScreen({ status: "loading" });

    try {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        throw new Error("Aucun onglet actif.");
      }

      await browser.tabs.sendMessage(activeTab.id, { type: "START_EXTRACTION" });
    } catch (reason) {
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
