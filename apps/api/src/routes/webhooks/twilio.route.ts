import { Router } from "express";
import { logger } from "../../lib/logger.js";
import { getTransferInfo } from "../../services/call-transfer.js";

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

twilioWebhookRouter.post("/transfer", async (req, res) => {
  const to = req.query?.to as string | undefined;
  const callSid = req.body?.CallSid as string | undefined;

  let transferNumber = to;
  let timeout = 30;
  if (!transferNumber && callSid) {
    const info = await getTransferInfo(callSid);
    if (info) {
      transferNumber = info.transferNumber;
      timeout = info.timeout;
    }
  }

  if (!transferNumber) {
    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="ja-JP">申し訳ございません。ただいま転送できません。後ほどお電話ください。</Say>
  <Hangup/>
</Response>`);
    return;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${timeout}" action="/webhooks/twilio/transfer-result" callerId="${escapeXml(req.body?.To ?? "")}">
    <Number>${escapeXml(transferNumber)}</Number>
  </Dial>
  <Say language="ja-JP">申し訳ございません。ただいまオペレーターが対応できません。折り返しお電話いたします。</Say>
</Response>`;
  res.type("text/xml").send(xml);
});

twilioWebhookRouter.post("/transfer-result", (req, res) => {
  const dialStatus = req.body?.DialCallStatus as string | undefined;
  logger.info({ dialStatus, callSid: req.body?.CallSid }, "transfer result");

  if (dialStatus === "completed" || dialStatus === "answered") {
    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Hangup/></Response>`);
  } else {
    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="ja-JP">オペレーターが不在のため、折り返しお電話いたします。</Say>
  <Hangup/>
</Response>`);
  }
});
