import type { Request, Response } from "express";
import { analysisService } from "../services/analysis.service";

const MAX_CONTENT_LENGTH = 100_000;
const MAX_TITLE_LENGTH = 1_000;

interface AnalyzeRequestBody {
  url: string;
  title?: string;
  content: string;
}

export class AnalysesController {
  async analyze(req: Request, res: Response): Promise<void> {
    const body = req.body as Partial<AnalyzeRequestBody> | undefined;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ success: false, message: "Le corps de la requête est invalide.", errorCode: "INVALID_BODY" });
      return;
    }

    if (typeof body.url !== "string" || body.url.trim().length === 0) {
      res.status(400).json({ success: false, message: "L'URL de la page est obligatoire.", errorCode: "INVALID_URL" });
      return;
    }

    if (typeof body.content !== "string" || body.content.trim().length === 0) {
      res.status(400).json({ success: false, message: "Le contenu de la page est obligatoire.", errorCode: "INVALID_CONTENT" });
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

    let pageUrl: URL;
    try {
      pageUrl = new URL(body.url);
    } catch {
      res.status(400).json({ success: false, message: "L'URL fournie est invalide.", errorCode: "INVALID_URL" });
      return;
    }

    if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") {
      res.status(400).json({
        success: false,
        message: "Seules les URLs HTTP et HTTPS sont autorisées.",
        errorCode: "INVALID_URL",
      });
      return;
    }

    try {
      const result = await analysisService.analyzePage({
        url: body.url,
        title: body.title ?? "",
        content: body.content,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Erreur lors de l'analyse fake-news :", error);
      res.status(500).json({
        success: false,
        message: "Une erreur est survenue pendant l'analyse.",
        errorCode: "ANALYSIS_FAILED",
      });
    }
  }
}

export const analysesController = new AnalysesController();
