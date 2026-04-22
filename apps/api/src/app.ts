import express from "express";
import cors from "cors";
import { logger } from "./lib/logger.js";
import { authRouter } from "./routes/auth.route.js";
import { numbersRouter } from "./routes/numbers.route.js";
import { scenariosRouter } from "./routes/scenarios.route.js";
import { callsRouter } from "./routes/calls.route.js";
import { dashboardRouter } from "./routes/dashboard.route.js";
import { twilioWebhookRouter } from "./routes/webhooks/twilio.route.js";
import { settingsRouter } from "./routes/settings.route.js";
import { usersRouter } from "./routes/users.route.js";
import { dictionaryRouter } from "./routes/dictionary.route.js";
import { billingRouter } from "./routes/billing.route.js";
import { vocRouter } from "./routes/voc.route.js";
import { callbacksRouter } from "./routes/callbacks.route.js";
import { monitorRouter } from "./routes/monitor.route.js";
import { transfersRouter } from "./routes/transfers.route.js";
import { formsRouter } from "./routes/forms.route.js";

export function createApp(): express.Express {
  const app = express();

  /** ブラウザ（Next.js 別ポート）からの fetch 用。本番は CORS_ORIGIN を必ず絞る */
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

  /** ブラウザで http://localhost:8080 を開いたときの案内（API のルートは HTML を返さないと「エラー」に見えやすい） */
  app.get("/", (req, res) => {
    const accept = req.headers.accept ?? "";
    if (accept.includes("text/html")) {
      res.type("text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"/><title>LogiVoice API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:2rem;line-height:1.6">
  <h1>LogiVoice API</h1>
  <p>これはバックエンド API です。管理画面は Next.js（デフォルト: <code>http://localhost:3010</code>）を開いてください。</p>
  <ul>
    <li><a href="/health">GET /health</a> — ヘルスチェック（JSON）</li>
    <li>REST API のベース: <code>/v1</code>（認証が必要）</li>
  </ul>
</body></html>`);
      return;
    }
    res.json({
      ok: true,
      service: "logivoice-api",
      health: "/health",
      apiBase: "/v1",
    });
  });

  app.use("/v1/auth", express.json(), authRouter);
  app.use("/v1/numbers", express.json(), numbersRouter);
  app.use("/v1/scenarios", express.json(), scenariosRouter);
  app.use("/v1/calls", express.json(), callsRouter);
  app.use("/v1/dashboard", express.json(), dashboardRouter);
  app.use("/v1/settings", express.json(), settingsRouter);
  app.use("/v1/users", express.json(), usersRouter);
  app.use("/v1/dictionary", express.json(), dictionaryRouter);
  app.use("/v1/billing", express.json(), billingRouter);
  app.use("/v1/voc", express.json(), vocRouter);
  app.use("/v1/callbacks", express.json(), callbacksRouter);
  app.use("/v1/monitor", express.json(), monitorRouter);
  app.use("/v1/transfers", express.json(), transfersRouter);
  app.use("/v1/forms", express.json(), formsRouter);
  app.use("/webhooks/twilio", express.urlencoded({ extended: false }), twilioWebhookRouter);

  return app;
}
