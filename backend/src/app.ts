import express from "express";
import { analysesRoutes } from "./routes/analyses.routes";
import { rabbitHoleRoutes } from "./routes/rabbit-hole.routes";
import { scamsRoutes } from "./routes/scams.routes";
import { toxicityRoutes } from "./routes/toxicity.routes";

const allowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  return origin === "http://localhost:3000" ||
    origin === "http://127.0.0.1:3000" ||
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("moz-extension://");
};

export function createApp() {
  const app = express();

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigin(origin)) {
      if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.use("/api/fake-news", analysesRoutes);
  app.use("/api/scams", scamsRoutes);
  app.use("/api/toxicity", toxicityRoutes);
  app.use("/api/rabbit-hole", rabbitHoleRoutes);

  return app;
}

export const app = createApp();
