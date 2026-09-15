import type {
  ExtractionErrorMessage,
  ExtractionPayload,
  ExtractionResultMessage,
} from "../types/extraction";
import type { AnalysisResultMessage } from "../types/messaging";
import type { PageAnalysisInput } from "../types/analysis";
import { analyzePage } from "./services/api.service";

const SAFEPLACE_DEBUG = true;

function createAnalysisId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `SP-${stamp}-${Math.random().toString(16).slice(2, 8)}`;
}

function debugLog(step: string, analysisId: string, message: string, detail?: Record<string, unknown>): void {
  if (!SAFEPLACE_DEBUG) return;
  const base = `[SafePlace][Background][${step}][${analysisId}] ${message}`;
  if (detail && Object.keys(detail).length > 0) {
    console.log(base, detail);
    return;
  }
  console.log(base);
}

function isExtractionPayload(value: unknown): value is ExtractionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ExtractionPayload>;
  return (
    typeof payload.url === "string" &&
    typeof payload.domain === "string" &&
    typeof payload.title === "string" &&
    typeof payload.text === "string" &&
    Array.isArray(payload.links) &&
    typeof payload.extractedAt === "number"
  );
}

function isMessageType(message: unknown, type: string): boolean {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === type
  );
}

function sendExtractionError(error: ExtractionErrorMessage): void {
  void browser.runtime
    .sendMessage({
      type: "EXTRACTION_ERROR",
      code: error.code,
      message: error.message,
    })
    .catch((reason) => {
      console.error(
        "[SafePlace][Background] Failed to send error to side panel.",
        reason,
      );
    });
}

function isMissingReceiverError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Could not establish connection|Receiving end does not exist/i.test(message);
}

async function waitForTabContentScript(tabId: number, analysisId: string): Promise<void> {
  try {
    const tab = await browser.tabs.get(tabId);
    if (tab.status === "complete" && tab.url && /^https?:/i.test(tab.url)) {
      return;
    }
  } catch {
    // Le tab peut être fermé ou rechargé pendant l’attente.
  }

  debugLog("CONTENT", analysisId, "Waiting for content script to become available", { tabId });

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onRemoved.removeListener(onRemoved);
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const onUpdated = (
      updatedTabId: number,
      changeInfo: { status?: string },
      tabInfo: { status?: string },
    ) => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === "complete" || tabInfo.status === "complete") {
        finish(() => resolve());
      }
    };

    const onRemoved = (removedTabId: number) => {
      if (removedTabId === tabId) {
        finish(() => reject(new Error("TAB_CLOSED")));
      }
    };

    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onRemoved.addListener(onRemoved);

    void browser.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === "complete" && tab.url && /^https?:/i.test(tab.url)) {
          finish(() => resolve());
        }
      })
      .catch(() => {
        finish(() => reject(new Error("TAB_UNAVAILABLE")));
      });
  });
}

async function sendStartExtractionToTab(tabId: number, analysisId: string, attempt = 0): Promise<void> {
  debugLog("CONTENT", analysisId, "Envoi START_EXTRACTION au Content Script", { tabId, attempt });

  try {
    await browser.tabs.sendMessage(tabId, { type: "START_EXTRACTION", debugAnalysisId: analysisId });
    debugLog("CONTENT", analysisId, "Message envoyé avec succès", { tabId, attempt });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    debugLog("ERROR", analysisId, "Échec sendMessage", {
      step: "CONTENT",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: message,
      tabId,
    });

    if (!isMissingReceiverError(error)) {
      throw error;
    }

    debugLog("ERROR", analysisId, "CONTENT_RECEIVER_UNAVAILABLE", {
      step: "CONTENT",
      tabId,
      errorMessage: message,
    });

    if (attempt >= 2) {
      throw new Error("CONTENT_SCRIPT_UNAVAILABLE");
    }

    await waitForTabContentScript(tabId, analysisId);
    await sendStartExtractionToTab(tabId, analysisId, attempt + 1);
  }
}

async function analyzeExtractedPage(payload: ExtractionPayload, analysisId: string): Promise<void> {
  const input: PageAnalysisInput = {
    url: payload.url,
    domain: payload.domain,
    title: payload.title,
    content: payload.text,
    links: payload.links,
    extractedAt: payload.extractedAt,
  };

  debugLog("BACKEND", analysisId, "Début analyse backend", {
    url: payload.url,
    title: payload.title,
    textLength: payload.text.length,
    linksCount: payload.links.length,
  });

  try {
    const analysis = await analyzePage(input, analysisId);
    const message: AnalysisResultMessage = {
      type: "ANALYSIS_RESULT",
      payload: analysis,
      debugAnalysisId: analysisId,
    };
    debugLog("RESULT", analysisId, "Résultat envoyé au Side Panel", {
      fakeNews: analysis.fakeNews.status,
      scams: analysis.scams.status,
      toxicity: analysis.toxicity.status,
      rabbitHole: analysis.rabbitHole.status,
    });
    await browser.runtime.sendMessage(message);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    debugLog("ERROR", analysisId, "Backend analysis failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: message,
    });
    console.error("[SafePlace][Background] Backend analysis failed.", error);
    sendExtractionError({
      type: "EXTRACTION_ERROR",
      code: "EXTRACTION_FAILED",
      message: "L'analyse backend est indisponible.",
    });
  }
}

export default defineBackground(() => {
  browser.sidePanel
    .setPanelBehavior({
      openPanelOnActionClick: true,
    })
    .catch((error) =>
      console.error("[SafePlace][Background] Side panel setup failed.", error),
    );

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (isMessageType(message, "START_EXTRACTION")) {
      const analysisId = typeof message === "object" && message && "debugAnalysisId" in message && typeof (message as { debugAnalysisId?: string }).debugAnalysisId === "string"
        ? (message as { debugAnalysisId: string }).debugAnalysisId
        : createAnalysisId();
      debugLog("START", analysisId, "Analyse demandée");

      void browser.tabs
        .query({ active: true, currentWindow: true })
        .then(async ([activeTab]) => {
          if (!activeTab?.id) {
            debugLog("ERROR", analysisId, "Aucun onglet actif", { code: "NO_ACTIVE_TAB" });
            sendExtractionError({
              type: "EXTRACTION_ERROR",
              code: "NO_ACTIVE_TAB",
              message: "Aucun onglet actif n'est disponible.",
            });
            return;
          }

          debugLog("TAB", analysisId, "Onglet actif détecté", {
            tabId: activeTab.id,
            url: activeTab.url ?? "unknown",
            title: activeTab.title ?? "unknown",
          });

          if (!activeTab.url || !/^https?:/i.test(activeTab.url)) {
            debugLog("ERROR", analysisId, "Page non scriptable", {
              tabId: activeTab.id,
              url: activeTab.url ?? "unknown",
              code: "UNSUPPORTED_PAGE",
            });
            sendExtractionError({
              type: "EXTRACTION_ERROR",
              code: "UNSUPPORTED_PAGE",
              message: "Cette page ne permet pas l'extraction.",
            });
            return;
          }

          try {
            await sendStartExtractionToTab(activeTab.id, analysisId);
          } catch (error) {
            const messageText = error instanceof Error ? error.message : String(error ?? "");
            debugLog("ERROR", analysisId, "Content script unavailable", {
              tabId: activeTab.id,
              errorName: error instanceof Error ? error.name : "UnknownError",
              errorMessage: messageText,
            });
            console.error(
              "[SafePlace][Background] Content script unavailable.",
              error,
            );
            sendExtractionError({
              type: "EXTRACTION_ERROR",
              code: "CONTENT_SCRIPT_UNAVAILABLE",
              message:
                "Le script d'extraction n'est pas disponible sur cette page. Le contenu n'a pas pu être injecté.",
            });
          }
        })
        .catch((error) => {
          debugLog("ERROR", analysisId, "Active tab lookup failed", {
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage: error instanceof Error ? error.message : String(error ?? ""),
          });
          console.error(
            "[SafePlace][Background] Active tab lookup failed.",
            error,
          );
          sendExtractionError({
            type: "EXTRACTION_ERROR",
            code: "NO_ACTIVE_TAB",
            message: "Impossible d'accéder à l'onglet actif.",
          });
        });
      return;
    }

    if (isMessageType(message, "EXTRACTION_ERROR")) {
      sendExtractionError(message as ExtractionErrorMessage);
      return;
    }

    if (!isMessageType(message, "EXTRACTION_RESULT")) {
      return;
    }

    const extractionMessage = message as ExtractionResultMessage;
    const analysisId = typeof extractionMessage === "object" && extractionMessage && "debugAnalysisId" in extractionMessage && typeof extractionMessage.debugAnalysisId === "string"
      ? extractionMessage.debugAnalysisId
      : createAnalysisId();
    debugLog("CONTENT", analysisId, "EXTRACTION_RESULT reçu", {
      url: extractionMessage.payload.url,
      title: extractionMessage.payload.title,
      titleLength: extractionMessage.payload.title.length,
      textLength: extractionMessage.payload.text.length,
      linkCount: extractionMessage.payload.links.length,
      extractionMethod: extractionMessage.payload.extractionMethod,
    });

    if (!isExtractionPayload(extractionMessage.payload)) {
      debugLog("ERROR", analysisId, "Payload d'extraction invalide", { code: "INVALID_EXTRACTION_RESULT" });
      sendExtractionError({
        type: "EXTRACTION_ERROR",
        code: "INVALID_EXTRACTION_RESULT",
        message: "Le résultat d'extraction est invalide.",
      });
      return;
    }

    void browser.runtime
      .sendMessage({
        type: "EXTRACTION_RESULT_FOR_PANEL",
        payload: extractionMessage.payload,
        debugAnalysisId: analysisId,
      })
      .catch((error) =>
        console.error(
          "[SafePlace][Background] Failed to forward extraction result.",
          error,
        ),
      );
    void analyzeExtractedPage(extractionMessage.payload, analysisId);
  });
});
