import type {
  AnalysisResponse,
  ModuleAnalysisFailure,
  ModuleAnalysisResult,
  PageAnalysisInput,
} from "../../types/analysis";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const API_TIMEOUT_MS = 15_000;

type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  message: string;
  errorCode?: string;
};

class ApiServiceError extends Error {
  readonly errorCode?: string;

  constructor(message: string, errorCode?: string) {
    super(message);
    this.name = "ApiServiceError";
    this.errorCode = errorCode;
  }
}

function toPayload(input: PageAnalysisInput): { url: string; title: string; content: string } {
  return { url: input.url, title: input.title, content: input.content };
}

async function postAnalysis<T>(path: string, requestBody: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const responseBody = await response.json() as ApiResponse<T>;
    if (!response.ok || !responseBody.success) {
      throw new ApiServiceError(
        responseBody.success ? `Backend error (${response.status}).` : responseBody.message,
        responseBody.success ? undefined : responseBody.errorCode,
      );
    }

    return responseBody.data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiServiceError("Le backend n'a pas répondu à temps.", "API_TIMEOUT");
    }
    if (error instanceof ApiServiceError) throw error;
    throw new ApiServiceError("Le backend est indisponible.", "API_UNAVAILABLE");
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

async function captureResult(
  action: () => Promise<Record<string, unknown>>,
): Promise<ModuleAnalysisResult> {
  try {
    return { status: "success", data: await action() };
  } catch (error) {
    const failure: ModuleAnalysisFailure = {
      status: "error",
      message: error instanceof Error ? error.message : "Analyse indisponible.",
      errorCode: error instanceof ApiServiceError ? error.errorCode : undefined,
    };
    return failure;
  }
}

export async function analyzePage(input: PageAnalysisInput): Promise<AnalysisResponse> {
  const [fakeNews, scams, toxicity, rabbitHole] = await Promise.all([
    captureResult(() => postAnalysis<Record<string, unknown>>("/api/fake-news/analyze", toPayload(input))),
    captureResult(() => postAnalysis<Record<string, unknown>>("/api/scams/analyze", toPayload(input))),
    captureResult(() => postAnalysis<Record<string, unknown>>("/api/toxicity/analyze", toPayload(input))),
    captureResult(() => postAnalysis<Record<string, unknown>>("/api/rabbit-hole/analyze", {
      url: input.url,
      contents: [{ id: `${input.url}-${input.extractedAt}`, title: input.title, text: input.content }],
    })),
  ]);

  return { fakeNews, scams, toxicity, rabbitHole };
}

export { API_BASE_URL, API_TIMEOUT_MS };
