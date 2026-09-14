import { Readability } from "@mozilla/readability";
import type {
  ExtractionPayload,
  ExtractedLink,
  StartExtractionMessage,
} from "../types/extraction";
import type { ExtractionErrorMessage } from "../types/extraction";

const MIN_READABILITY_TEXT_LENGTH = 200;

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
    browser.runtime.onMessage.addListener((message: unknown) => {
      if (!isStartExtractionMessage(message)) {
        return;
      }

      try {
        const payload = extractPage();
        void browser.runtime.sendMessage({ type: "EXTRACTION_RESULT", payload }).catch((reason) => {
          console.error("[SafePlace][Content] Failed to send extraction result.", reason);
        });
      } catch (error) {
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
