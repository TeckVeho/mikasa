import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get("/tenant", async (req, res) => {
  const t = await prisma.tenant.findUnique({
    where: { id: req.tenantId! },
  });
  if (!t) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  res.json({
    ok: true,
    data: {
      companyName: t.name,
      maintenanceMode: t.maintenanceMode,
      maintenanceMessage: t.maintenanceMessage,
      billingPlan: t.billingPlan,
      voiceEngine: t.voiceEngine,
    },
  });
});

settingsRouter.patch("/tenant", async (req, res) => {
  const companyName = req.body?.companyName as string | undefined;
  const maintenanceMode = req.body?.maintenanceMode as boolean | undefined;
  const maintenanceMessage = req.body?.maintenanceMessage as string | undefined;
  const data: {
    name?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: string | null;
  } = {};
  if (companyName !== undefined) data.name = companyName;
  if (maintenanceMode !== undefined) data.maintenanceMode = maintenanceMode;
  if (maintenanceMessage !== undefined) data.maintenanceMessage = maintenanceMessage;
  await prisma.tenant.update({
    where: { id: req.tenantId! },
    data,
  });
  sendResult(res, { ok: true, data: true });
});

/** API キーは環境変数管理が前提のため、設定済みフラグのみ返す */
settingsRouter.get("/api-keys", async (_req, res) => {
  res.json({
    ok: true,
    data: {
      amivoiceKey: process.env.AMIVOICE_APP_KEY ? "set" : "",
      openaiKey: process.env.OPENAI_API_KEY ? "set" : "",
      twilioSid: process.env.TWILIO_ACCOUNT_SID ? "set" : "",
      twilioToken: process.env.TWILIO_AUTH_TOKEN ? "set" : "",
    },
  });
});

settingsRouter.patch("/api-keys", async (_req, res) => {
  sendResult(res, {
    ok: false,
    error: "API keys are configured via environment variables",
    code: "VALIDATION_ERROR",
  });
});

settingsRouter.post("/test-connection", async (req, res) => {
  const service = req.body?.service as string | undefined;
  sendResult(res, {
    ok: true,
    data: { success: Boolean(service) },
  });
});

settingsRouter.get("/notifications", async (req, res) => {
  const t = await prisma.tenant.findUnique({
    where: { id: req.tenantId! },
    select: {
      notifyCallComplete: true,
      notifyTransfer: true,
      notifyEmail: true,
    },
  });
  if (!t) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  sendResult(res, {
    ok: true,
    data: {
      callCompleteEmail: t.notifyCallComplete,
      transferEmail: t.notifyTransfer,
      notifyEmail: t.notifyEmail ?? "",
    },
  });
});

settingsRouter.patch("/notifications", async (req, res) => {
  const callCompleteEmail = req.body?.callCompleteEmail as boolean | undefined;
  const transferEmail = req.body?.transferEmail as boolean | undefined;
  const notifyEmail = req.body?.notifyEmail as string | undefined;

  const data: {
    notifyCallComplete?: boolean;
    notifyTransfer?: boolean;
    notifyEmail?: string | null;
  } = {};
  if (callCompleteEmail !== undefined) data.notifyCallComplete = callCompleteEmail;
  if (transferEmail !== undefined) data.notifyTransfer = transferEmail;
  if (notifyEmail !== undefined) data.notifyEmail = notifyEmail || null;

  await prisma.tenant.update({
    where: { id: req.tenantId! },
    data,
  });
  sendResult(res, { ok: true, data: true });
});

settingsRouter.put("/voice-engine", async (req, res) => {
  const engine = req.body?.voiceEngine as string | undefined;
  if (engine !== "flow" && engine !== "gemini_live") {
    res
      .status(422)
      .json({ ok: false, error: "VALIDATION_ERROR", message: 'voiceEngine must be "flow" or "gemini_live"' });
    return;
  }
  await prisma.tenant.update({
    where: { id: req.tenantId! },
    data: { voiceEngine: engine },
  });
  sendResult(res, { ok: true, data: { voiceEngine: engine } });
});
