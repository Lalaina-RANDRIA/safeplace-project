import type { Request, Response } from "express";
import { analysisService } from "../services/analysis.service";

interface AnalyzeRequestBody {
  url: string;
  title?: string;
  content: string;
}

export class AnalysesController {
  async analyze(req: Request, res: Response): Promise<void> {
    const body = req.body as Partial<AnalyzeRequestBody> | undefined;

    if (!body || typeof body.url !== "string" || body.url.length === 0) {
      res.status(400).json({ success: false, message: "L'URL de la page est obligatoire." });
      return;
    }

    if (typeof body.content !== "string" || body.content.length === 0) {
      res.status(400).json({ success: false, message: "Le contenu de la page est obligatoire." });
      return;
    }

    let pageUrl: URL;
    try {
      pageUrl = new URL(body.url);
    } catch {
      res.status(400).json({ success: false, message: "L'URL fournie est invalide." });
      return;
    }

    if (pageUrl.protocol !== "http:" && pageUrl.protocol !== "https:") {
      res.status(400).json({
        success: false,
        message: "Seules les URLs HTTP et HTTPS sont autorisées.",
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
      });
    }
  }
}

export const analysesController = new AnalysesController();
