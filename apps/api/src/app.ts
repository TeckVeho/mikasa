import express from "express";
import cors from "cors";
import { logger } from "./lib/logger.js";
import { authRouter } from "./routes/auth.route.js";
import { masterRouter } from "./routes/master.route.js";
import { projectsRouter } from "./routes/projects.route.js";
import { dailyRouter, dashboardRouter } from "./routes/dashboard.route.js";
import { historicalRouter } from "./routes/historical.route.js";

export function createApp(): express.Express {
  const app = express();

  const corsOrigin =
    process.env.NODE_ENV === "production"
      ? process.env.CORS_ORIGIN
          ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
          : false
      : true;
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );

  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url });
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/", (req, res) => {
    const accept = req.headers.accept ?? "";
    if (accept.includes("text/html")) {
      res.type("text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"/><title>ミカサ金属 API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:2rem;line-height:1.6">
  <h1>ミカサ金属 API</h1>
  <p>ミカサ金属 負荷計算システム API</p>
  <ul>
    <li><a href="/health">GET /health</a></li>
    <li>REST API: <code>/v1</code></li>
  </ul>
</body></html>`);
      return;
    }
    res.json({
      ok: true,
      service: "misaki-api",
      health: "/health",
      apiBase: "/v1",
    });
  });

  const json = express.json();
  app.use("/v1/auth", json, authRouter);
  app.use("/v1", json, masterRouter);
  app.use("/v1/projects", json, projectsRouter);
  app.use("/v1", json, dailyRouter);
  app.use("/v1/dashboard", json, dashboardRouter);
  app.use("/v1/historical-averages", json, historicalRouter);

  return app;
}
