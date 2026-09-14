import type { Request, Response } from "express";
import { loggerService } from "../../../shared/services/logger.service.ts";
import { parseHttpUrl } from "../../../shared/utils/url.util.ts";
import { scamService } from "../services/scam.service.ts";

const MAX_CONTENT_LENGTH = 100_000;
const MAX_TITLE_LENGTH = 1_000;

interface ScamRequestBody {
  url?: unknown;
  title?: unknown;
  content?: unknown;
}

export class ScamsController {
  async analyze(req: Request, res: Response): Promise<void> {
    loggerService.info("[SCAMS] analyze:start");
    const body = req.body as ScamRequestBody | undefined;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ success: false, message: "Le corps de la requête est invalide.", errorCode: "INVALID_BODY" });
      return;
    }

    if (typeof body.url !== "string" || !parseHttpUrl(body.url)) {
      res.status(400).json({ success: false, message: "URL invalide.", errorCode: "INVALID_URL" });
      return;
    }

    if (typeof body.content !== "string" || body.content.trim().length === 0) {
      res.status(400).json({ success: false, message: "Le contenu est invalide.", errorCode: "INVALID_CONTENT" });
      return;
    }

    if (body.content.length > MAX_CONTENT_LENGTH) {
      res.status(413).json({ success: false, message: "Le contenu est trop volumineux.", errorCode: "CONTENT_TOO_LARGE" });
      return;
    }

    if (body.title !== undefined && typeof body.title !== "string") {
      res.status(400).json({ success: false, message: "Le titre est invalide.", errorCode: "INVALID_TITLE" });
      return;
    }

    if (typeof body.title === "string" && body.title.length > MAX_TITLE_LENGTH) {
      res.status(413).json({ success: false, message: "Le titre est trop volumineux.", errorCode: "TITLE_TOO_LARGE" });
      return;
    }

    try {
      loggerService.info("[SCAMS] analyze:url");
      const result = scamService.analyze({
        url: body.url,
        title: typeof body.title === "string" ? body.title : "",
        content: body.content,
      });
      loggerService.info("[SCAMS] analyze:content");
      loggerService.info("[SCAMS] analyze:identity");
      loggerService.info("[SCAMS] analyze:scoring");
      loggerService.info("[SCAMS] analyze:success");
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      loggerService.error("[SCAMS] analyze:error", error instanceof Error ? error.message : "unknown error");
      res.status(500).json({ success: false, message: "Analyse scam indisponible.", errorCode: "SCAM_ANALYSIS_FAILED" });
    }
  }
}
export const scamsController = new ScamsController();
