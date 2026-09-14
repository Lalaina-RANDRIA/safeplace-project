import { Router } from "express";
import { scamsController } from "../controllers/scams.controller";

export const scamsRoutes = Router();
scamsRoutes.post("/analyze", (req, res) => { void scamsController.analyze(req, res); });
