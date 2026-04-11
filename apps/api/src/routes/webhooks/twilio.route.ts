import { Router } from "express";
import { logger } from "../../lib/logger.js";

export const twilioWebhookRouter = Router();

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

twilioWebhookRouter.post("/voice", (req, res) => {
  const To = (req.body?.To as string) ?? "";
  const From = (req.body?.From as string) ?? "";
  const base =
    process.env.API_PUBLIC_URL?.replace(/^http/, "ws") ?? "ws://localhost:8080";
  const streamUrl = `${base}/call-stream?called=${encodeURIComponent(To)}&from=${encodeURIComponent(From)}`;
  logger.info({ To, From, streamUrl }, "twilio voice webhook");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(streamUrl)}">
      <Parameter name="called" value="${escapeXml(To)}" />
      <Parameter name="from" value="${escapeXml(From)}" />
    </Stream>
  </Connect>
</Response>`;
  res.type("text/xml").send(xml);
});

twilioWebhookRouter.post("/status", (req, res) => {
  logger.info({ body: req.body }, "twilio status");
  res.sendStatus(204);
});
