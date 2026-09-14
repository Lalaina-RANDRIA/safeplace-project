import { Router } from "express";
import { analysesController } from "../controllers/analyses.controller";

export const fakeNewsRoutes = Router();
fakeNewsRoutes.post("/analyze", (req, res) => {
  void analysesController.analyze(req, res);
});
