import type { Request, Response } from "express";
import { rabbitHoleService } from "../services/rabbit-hole.service";
import type { RabbitHoleContent } from "../types/rabbit-hole";

export class RabbitHoleController {
  async analyze(req: Request, res: Response): Promise<void> {
    const body = req.body as { url?: unknown; contents?: unknown } | undefined;
    if (typeof body?.url !== "string" || !Array.isArray(body.contents)) {
      res.status(400).json({ success: false, message: "url et contents sont obligatoires." });
      return;
    }
    const contents = body.contents as RabbitHoleContent[];
    res.status(200).json({ success: true, data: rabbitHoleService.analyze({ url: body.url, contents }) });
  }
}
export const rabbitHoleController = new RabbitHoleController();
