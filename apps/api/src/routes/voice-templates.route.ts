import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";

export const voiceTemplatesRouter = Router();
voiceTemplatesRouter.use(requireAuth);

voiceTemplatesRouter.get("/", async (req, res) => {
  const rows = await prisma.voiceTemplate.findMany({
    where: { tenantId: req.tenantId! },
    orderBy: { createdAt: "desc" },
  });
  sendResult(res, { ok: true, data: rows });
});

voiceTemplatesRouter.post("/", async (req, res) => {
  const name = req.body?.name as string | undefined;
  const storagePath = req.body?.storagePath as string | undefined;
  if (!name || !storagePath) {
    res.status(422).json({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "name and storagePath required",
    });
    return;
  }
  const row = await prisma.voiceTemplate.create({
    data: {
      id: newId(),
      tenantId: req.tenantId!,
      name,
      storagePath,
      durationMs: req.body?.durationMs as number | undefined,
    },
  });
  sendResult(res, { ok: true, data: row });
});

voiceTemplatesRouter.delete("/:id", async (req, res) => {
  const n = await prisma.voiceTemplate.deleteMany({
    where: { id: req.params.id, tenantId: req.tenantId! },
  });
  if (n.count === 0) {
    sendResult(res, { ok: false, error: "Not found", code: "NOT_FOUND" });
    return;
  }
  sendResult(res, { ok: true, data: true });
});
