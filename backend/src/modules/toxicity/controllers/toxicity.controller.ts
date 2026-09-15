import type { Request, Response } from "express";
import { toxicityService } from "../services/toxicity.service";

export class ToxicityController {
  async analyze(req: Request, res: Response): Promise<void> {
    const body = req.body as { url?: unknown; title?: unknown; content?: unknown } | undefined;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ success: false, message: "Le corps de la requête est invalide.", errorCode: "INVALID_BODY" });
      return;
    }
    if (typeof body.url !== "string" || !/^https?:\/\//i.test(body.url)) {
      res.status(400).json({ success: false, message: "URL invalide.", errorCode: "INVALID_URL" });
      return;
    }
    if (typeof body.content !== "string" || body.content.trim().length === 0) {
      res.status(400).json({ success: false, message: "Le contenu est invalide.", errorCode: "INVALID_CONTENT" });
      return;
    }
    if (body.content.length > 100_000) {
      res.status(413).json({ success: false, message: "Le contenu est trop volumineux.", errorCode: "CONTENT_TOO_LARGE" });
      return;
    }
    try {
      const result = await toxicityService.analyze({ url: body.url, title: typeof body.title === "string" ? body.title : "", content: body.content });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("[TOXICITY] analysis failed", error);
      res.status(500).json({ success: false, message: "Analyse Toxicity indisponible.", errorCode: "TOXICITY_ANALYSIS_FAILED" });
    }
  }
}
export const toxicityController = new ToxicityController();
