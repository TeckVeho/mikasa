import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyFormAccessToken } from "../utils/form-token.js";

/** Public form API. Token は signFormAccessToken で発行した署名付き文字列。 */
export const formsRouter = Router();

formsRouter.get("/:token", async (req, res) => {
  const token = req.params.token;
  const verified = verifyFormAccessToken(token);
  if (!verified.ok) {
    res.status(403).json({ ok: false, error: "FORBIDDEN", message: verified.error });
    return;
  }
  const { callLogId, tenantId } = verified.payload;

  const log = await prisma.callLog.findFirst({
    where: { id: callLogId, tenantId },
    select: {
      id: true,
      structuredData: true,
      callerNumber: true,
      transcriptText: true,
    },
  });
  if (!log) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  res.json({ ok: true, data: log });
});

formsRouter.patch("/:token", async (req, res) => {
  const token = req.params.token;
  const verified = verifyFormAccessToken(token);
  if (!verified.ok) {
    res.status(403).json({ ok: false, error: "FORBIDDEN", message: verified.error });
    return;
  }
  const { callLogId, tenantId } = verified.payload;

  const structuredData = req.body?.structuredData;
  if (structuredData === undefined) {
    res.status(422).json({ ok: false, error: "structuredData required" });
    return;
  }
  const n = await prisma.callLog.updateMany({
    where: { id: callLogId, tenantId },
    data: { structuredData },
  });
  if (n.count === 0) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  res.json({ ok: true, data: true });
});
