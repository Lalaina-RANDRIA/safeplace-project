import type {
  ExtractionErrorMessage,
  ExtractionPayload,
  ExtractionResultMessage,
} from "../types/extraction";
import type { AnalysisResultMessage } from "../types/messaging";
import type { PageAnalysisInput } from "../types/analysis";
import { analyzePage } from "./services/api.service";

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

async function analyzeExtractedPage(payload: ExtractionPayload): Promise<void> {
  const input: PageAnalysisInput = {
    url: payload.url,
    domain: payload.domain,
    title: payload.title,
    content: payload.text,
    links: payload.links,
    extractedAt: payload.extractedAt,
  };

  try {
    const analysis = await analyzePage(input);
    const message: AnalysisResultMessage = {
      type: "ANALYSIS_RESULT",
      payload: analysis,
    };
    await browser.runtime.sendMessage(message);
  } catch (error) {
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
      void browser.tabs
        .query({ active: true, currentWindow: true })
        .then(async ([activeTab]) => {
          if (!activeTab?.id) {
            sendExtractionError({
              type: "EXTRACTION_ERROR",
              code: "NO_ACTIVE_TAB",
              message: "Aucun onglet actif n'est disponible.",
            });
            return;
          }

          if (!activeTab.url || !/^https?:/i.test(activeTab.url)) {
            sendExtractionError({
              type: "EXTRACTION_ERROR",
              code: "UNSUPPORTED_PAGE",
              message: "Cette page ne permet pas l'extraction.",
            });
            return;
          }

          try {
            await browser.tabs.sendMessage(activeTab.id, {
              type: "START_EXTRACTION",
            });
          } catch (error) {
            console.error(
              "[SafePlace][Background] Content script unavailable.",
              error,
            );
            sendExtractionError({
              type: "EXTRACTION_ERROR",
              code: "CONTENT_SCRIPT_UNAVAILABLE",
              message:
                "Le script d'extraction n'est pas disponible sur cette page.",
            });
          }
        })
        .catch((error) => {
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
    if (!isExtractionPayload(extractionMessage.payload)) {
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
      })
      .catch((error) =>
        console.error(
          "[SafePlace][Background] Failed to forward extraction result.",
          error,
        ),
      );
    void analyzeExtractedPage(extractionMessage.payload);
  });
});
