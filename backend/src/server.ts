import express from "express";
import { analysesRoutes } from "./routes/analyses.routes";
import { rabbitHoleRoutes } from "./routes/rabbit-hole.routes";
import { scamsRoutes } from "./routes/scams.routes";
import { toxicityRoutes } from "./routes/toxicity.routes";

export function createServer() {
	const app = express();
	app.use(express.json());
	app.use("/api/fake-news", analysesRoutes);
	app.use("/api/scams", scamsRoutes);
	app.use("/api/toxicity", toxicityRoutes);
	app.use("/api/rabbit-hole", rabbitHoleRoutes);
	return app;
}

export const app = createServer();
