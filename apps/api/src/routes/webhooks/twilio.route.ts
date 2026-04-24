import { Router } from "express";
import { logger } from "../../lib/logger.js";
import { getTransferInfo } from "../../services/call-transfer.js";
import { prisma } from "../../lib/prisma.js";

export const twilioWebhookRouter = Router();

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildStreamUrl(called: string, from: string, scenarioId?: string | null): string {
  const base =
    process.env.API_PUBLIC_URL?.replace(/^http/, "ws") ?? "ws://localhost:8080";
  let url = `${base}/call-stream?called=${encodeURIComponent(called)}&from=${encodeURIComponent(from)}`;
  if (scenarioId) url += `&scenarioId=${encodeURIComponent(scenarioId)}`;
  return url;
}

twilioWebhookRouter.post("/voice", async (req, res) => {
  const To = (req.body?.To as string) ?? "";
  const From = (req.body?.From as string) ?? "";

  const phone = await prisma.phoneNumber.findFirst({
    where: { number: To },
    include: { ivrRoutes: { orderBy: { sortOrder: "asc" } } },
  });

  logger.info({ To, From, ivrEnabled: phone?.ivrEnabled }, "twilio voice webhook");

  if (phone?.ivrEnabled && phone.ivrRoutes.length > 0) {
    const ivrMessage = phone.ivrMessage ?? "";
    const actionUrl = `/webhooks/twilio/ivr-route?called=${encodeURIComponent(To)}&from=${encodeURIComponent(From)}`;
    const defaultStreamUrl = buildStreamUrl(To, From);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${escapeXml(actionUrl)}" timeout="10">
    <Say language="ja-JP">${escapeXml(ivrMessage)}</Say>
  </Gather>
  <Gather numDigits="1" action="${escapeXml(actionUrl)}" timeout="10">
    <Say language="ja-JP">もう一度ご案内いたします。${escapeXml(ivrMessage)}</Say>
  </Gather>
  <Say language="ja-JP">入力が確認できませんでした。担当におつなぎいたします。</Say>
  <Connect>
    <Stream url="${escapeXml(defaultStreamUrl)}">
      <Parameter name="called" value="${escapeXml(To)}" />
      <Parameter name="from" value="${escapeXml(From)}" />
    </Stream>
  </Connect>
</Response>`;
    res.type("text/xml").send(xml);
    return;
  }

  const streamUrl = buildStreamUrl(To, From);
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

twilioWebhookRouter.post("/ivr-route", async (req, res) => {
  const Digits = (req.body?.Digits as string) ?? "";
  const called = (req.query?.called as string) ?? "";
  const from = (req.query?.from as string) ?? "";

  const phone = await prisma.phoneNumber.findFirst({
    where: { number: called },
    include: { ivrRoutes: true },
  });

  const route = phone?.ivrRoutes.find((r) => r.digit === Digits);
  const scenarioId = route?.scenarioId ?? phone?.scenarioId;

  logger.info({ Digits, called, scenarioId }, "ivr-route selected");

  const streamUrl = buildStreamUrl(called, from, scenarioId);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(streamUrl)}">
      <Parameter name="called" value="${escapeXml(called)}" />
      <Parameter name="from" value="${escapeXml(from)}" />
      <Parameter name="scenarioId" value="${escapeXml(scenarioId ?? "")}" />
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
