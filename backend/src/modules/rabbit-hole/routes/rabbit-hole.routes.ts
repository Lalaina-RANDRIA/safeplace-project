import { Router } from "express";
import { rabbitHoleController } from "../controllers/rabbit-hole.controller";

export const rabbitHoleRoutes = Router();
rabbitHoleRoutes.post("/analyze", (req, res) => { void rabbitHoleController.analyze(req, res); });
