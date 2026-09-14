import type { Request, Response } from "express";
import { toxicityService } from "../services/toxicity.service";

export class ToxicityController {
  async analyze(req: Request, res: Response): Promise<void> {
    const body = req.body as { url?: unknown; title?: unknown; content?: unknown } | undefined;
    if (typeof body?.url !== "string" || typeof body.content !== "string") {
      res.status(400).json({ success: false, message: "url et content sont obligatoires." });
      return;
    }
    res.status(200).json({ success: true, data: toxicityService.analyze({ url: body.url, title: typeof body.title === "string" ? body.title : "", content: body.content }) });
  }
}
export const toxicityController = new ToxicityController();
