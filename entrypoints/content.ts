import { Readability } from "@mozilla/readability";
import type {
  ExtractionPayload,
  ExtractedLink,
  StartExtractionMessage,
} from "../types/extraction";
import type { ExtractionErrorMessage } from "../types/extraction";

const MIN_READABILITY_TEXT_LENGTH = 200;
const SAFEPLACE_DEBUG = true;

function createAnalysisId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `SP-${stamp}-${Math.random().toString(16).slice(2, 8)}`;
}

function debugLog(step: string, analysisId: string, message: string, detail?: Record<string, unknown>): void {
  if (!SAFEPLACE_DEBUG) return;
  const base = `[SafePlace][Content][${step}][${analysisId}] ${message}`;
  if (detail && Object.keys(detail).length > 0) {
    console.log(base, detail);
    return;
  }
  console.log(base);
}

const PLATFORM_SELECTORS: Record<string, string[]> = {
  "facebook.com": ['[role="main"]', '[data-pagelet="FeedUnit_0"]'],
  "instagram.com": ["article", "main"],
  "reddit.com": ["shreddit-post", '[data-testid="post-container"]', "main"],
  "tiktok.com": ["main", '[data-e2e="browse-video-desc"]'],
  "twitter.com": ["article", '[data-testid="primaryColumn"]'],
  "x.com": ["article", '[data-testid="primaryColumn"]'],
  "youtube.com": ["#description-inline-expander", "#description", "main"],
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getPlatformSelectors(hostname: string): string[] {
  const platform = Object.keys(PLATFORM_SELECTORS).find(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );

  return platform ? (PLATFORM_SELECTORS[platform] ?? []) : [];
}

function extractWithReadability(): { title: string; text: string } | null {
  try {
    const clonedDocument = document.cloneNode(true) as Document;
    const article = new Readability(clonedDocument).parse();
    const text = normalizeText(article?.textContent ?? "");

    if (!article || text.length < MIN_READABILITY_TEXT_LENGTH) {
      return null;
    }

    return {
      title: normalizeText(article.title || document.title),
      text,
    };
  } catch (error) {
    console.warn("SafePlace: Readability extraction failed.", error);
    return null;
  }
}

function extractWithSelectors(): { title: string; text: string } | null {
  for (const selector of getPlatformSelectors(location.hostname)) {
    try {
      const elements = Array.from(document.querySelectorAll(selector));
      const text = normalizeText(
        elements.map((element) => element.textContent ?? "").join(" "),
      );

      if (text.length >= MIN_READABILITY_TEXT_LENGTH) {
        return { title: normalizeText(document.title), text };
      }
    } catch (error) {
      console.warn(
        `SafePlace: selector extraction failed for ${selector}.`,
        error,
      );
    }
  }

  return null;
}

function extractLinks(): ExtractedLink[] {
  const links = new Map<string, ExtractedLink>();

  for (const anchor of Array.from(
    document.querySelectorAll<HTMLAnchorElement>("a[href]"),
  )) {
    try {
      const url = new URL(anchor.href, location.href);

      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.origin === location.origin
      ) {
        continue;
      }

      links.set(url.href, {
        href: url.href,
        text: normalizeText(anchor.textContent ?? ""),
      });
    } catch (error) {
      console.warn("SafePlace: link extraction failed.", error);
    }
  }

  return Array.from(links.values());
}

function extractPage(): ExtractionPayload {
  const readabilityResult = extractWithReadability();
  const fallbackResult = readabilityResult ? null : extractWithSelectors();
  const result = readabilityResult ?? fallbackResult;

  return {
    url: location.href,
    domain: location.hostname,
    title: result?.title || normalizeText(document.title),
    text: result?.text ?? "",
    extractionMethod: readabilityResult
      ? "readability"
      : fallbackResult
        ? "selector-fallback"
        : "none",
    links: extractLinks(),
    extractedAt: Date.now(),
  };
}

function isStartExtractionMessage(message: unknown): message is StartExtractionMessage {
  return typeof message === "object" && message !== null &&
    (message as { type?: unknown }).type === "START_EXTRACTION";
}

function sendExtractionError(error: ExtractionErrorMessage): void {
  void browser.runtime.sendMessage(error).catch((reason) => {
    console.error("[SafePlace][Content] Failed to send extraction error.", reason);
  });
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    const localAnalysisId = createAnalysisId();
    debugLog("LISTENER", localAnalysisId, "Listener installé");

    browser.runtime.onMessage.addListener((message: unknown) => {
      if (!isStartExtractionMessage(message)) {
        return;
      }

      const analysisId = typeof message === "object" && message && "debugAnalysisId" in message && typeof (message as { debugAnalysisId?: string }).debugAnalysisId === "string"
        ? (message as { debugAnalysisId: string }).debugAnalysisId
        : "unknown";
      debugLog("CONTENT", analysisId, "START_EXTRACTION reçu");

      try {
        const startedAt = performance.now();
        const payload = extractPage();
        const durationMs = Math.round(performance.now() - startedAt);
        debugLog("EXTRACTION", analysisId, "Extraction terminée", {
          extractionMethod: payload.extractionMethod,
          titleLength: payload.title.length,
          textLength: payload.text.length,
          linkCount: payload.links.length,
          durationMs,
        });

        void browser.runtime.sendMessage({ type: "EXTRACTION_RESULT", payload, debugAnalysisId: analysisId }).then(() => {
          debugLog("CONTENT", analysisId, "EXTRACTION_RESULT envoyé avec succès");
        }).catch((reason) => {
          debugLog("ERROR", analysisId, "Échec sendMessage", {
            step: "CONTENT",
            errorName: reason instanceof Error ? reason.name : "UnknownError",
            errorMessage: reason instanceof Error ? reason.message : String(reason ?? ""),
          });
          console.error("[SafePlace][Content] Failed to send extraction result.", reason);
        });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error ?? "");
        debugLog("ERROR", analysisId, "Extraction failed", {
          step: "CONTENT",
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorMessage: messageText,
        });
        console.error("[SafePlace][Content] Extraction failed.", error);
        sendExtractionError({
          type: "EXTRACTION_ERROR",
          code: "EXTRACTION_FAILED",
          message: "La page n'a pas pu être extraite.",
        });
      }
    });
  },
});
