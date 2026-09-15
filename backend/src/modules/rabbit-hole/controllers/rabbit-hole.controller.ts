import type { Request, Response } from "express";
import { rabbitHoleService } from "../services/rabbit-hole.service";
import type { RabbitHoleContent } from "../types/rabbit-hole";

const MAX_CONTENT_LENGTH = 100_000;
const MAX_TEXT_LENGTH = 10_000;

export class RabbitHoleController {
  async analyze(req: Request, res: Response): Promise<void> {
    const body = req.body as { url?: unknown; contents?: unknown } | undefined;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ success: false, message: "Le corps de la requête est invalide.", errorCode: "INVALID_BODY" });
      return;
    }

    if (typeof body.url !== "string" || body.url.trim().length === 0) {
      res.status(400).json({ success: false, message: "L'URL de la page est obligatoire.", errorCode: "INVALID_URL" });
      return;
    }

    if (!Array.isArray(body.contents)) {
      res.status(400).json({ success: false, message: "Le tableau contents est obligatoire.", errorCode: "INVALID_CONTENTS" });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.url);
    } catch {
      res.status(400).json({ success: false, message: "L'URL fournie est invalide.", errorCode: "INVALID_URL" });
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      res.status(400).json({ success: false, message: "Seules les URLs HTTP et HTTPS sont autorisées.", errorCode: "INVALID_URL" });
      return;
    }

    if (body.contents.length === 0) {
      res.status(400).json({ success: false, message: "Le tableau contents ne peut pas être vide.", errorCode: "EMPTY_CONTENTS" });
      return;
    }

    for (const content of body.contents as unknown[]) {
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        res.status(400).json({ success: false, message: "Un élément de contents est invalide.", errorCode: "INVALID_CONTENT" });
        return;
      }
      const item = content as Partial<RabbitHoleContent>;
      if (typeof item.id !== "string" || item.id.trim().length === 0) {
        res.status(400).json({ success: false, message: "L'identifiant de chaque contenu est requis.", errorCode: "INVALID_CONTENT" });
        return;
      }
      if (typeof item.text !== "string" || item.text.trim().length === 0) {
        res.status(400).json({ success: false, message: "Le texte de chaque contenu est requis.", errorCode: "INVALID_CONTENT" });
        return;
      }
      if (item.text.length > MAX_TEXT_LENGTH) {
        res.status(413).json({ success: false, message: "Un contenu dépasse la taille maximale autorisée.", errorCode: "CONTENT_TOO_LARGE" });
        return;
      }
      if (item.timestamp !== undefined && typeof item.timestamp !== "string") {
        res.status(400).json({ success: false, message: "Le timestamp est invalide.", errorCode: "INVALID_TIMESTAMP" });
        return;
      }
      if (item.timestamp && Number.isNaN(Date.parse(item.timestamp))) {
        res.status(400).json({ success: false, message: "Le timestamp est invalide.", errorCode: "INVALID_TIMESTAMP" });
        return;
      }
      if (item.recommendedFrom !== undefined && (typeof item.recommendedFrom !== "string" || item.recommendedFrom.trim().length === 0)) {
        res.status(400).json({ success: false, message: "recommendedFrom est invalide.", errorCode: "INVALID_RECOMMENDATION" });
        return;
      }
    }

    const contents = body.contents as RabbitHoleContent[];
    try {
      const result = await rabbitHoleService.analyze({ url: body.url, contents });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Erreur lors de l'analyse Rabbit Hole :", error);
      res.status(500).json({ success: false, message: "Une erreur est survenue pendant l'analyse.", errorCode: "ANALYSIS_FAILED" });
    }
  }
}
export const rabbitHoleController = new RabbitHoleController();
