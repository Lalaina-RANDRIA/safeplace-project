import { Router } from "express";
import { toxicityController } from "../controllers/toxicity.controller";

export const toxicityRoutes = Router();
toxicityRoutes.post("/analyze", (req, res) => { void toxicityController.analyze(req, res); });
