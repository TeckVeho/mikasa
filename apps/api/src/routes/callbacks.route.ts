import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";

export const callbacksRouter = Router();
callbacksRouter.use(requireAuth);

callbacksRouter.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  const where: Record<string, unknown> = { tenantId: req.tenantId! };
  if (status && status !== "all") where.status = status;

  const rows = await prisma.callbackRequest.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
    take: 200,
  });
  sendResult(res, { ok: true, data: rows });
});

callbacksRouter.patch("/:id/assign", async (req, res) => {
  const assigneeId = req.body?.assigneeId as string | undefined;
  if (!assigneeId) {
    sendResult(res, { ok: false, error: "assigneeId required", code: "VALIDATION_ERROR" });
    return;
  }
  const n = await prisma.callbackRequest.updateMany({
    where: { id: req.params.id, tenantId: req.tenantId! },
    data: { assigneeId },
  });
  if (n.count === 0) {
    sendResult(res, { ok: false, error: "Not found", code: "NOT_FOUND" });
    return;
  }
  sendResult(res, { ok: true, data: true });
});

callbacksRouter.patch("/:id/complete", async (req, res) => {
  const note = (req.body?.note as string | undefined) ?? undefined;
  const n = await prisma.callbackRequest.updateMany({
    where: { id: req.params.id, tenantId: req.tenantId! },
    data: { status: "completed", completedAt: new Date(), ...(note !== undefined && { note }) },
  });
  if (n.count === 0) {
    sendResult(res, { ok: false, error: "Not found", code: "NOT_FOUND" });
    return;
  }
  sendResult(res, { ok: true, data: true });
});

callbacksRouter.patch("/:id/no-answer", async (req, res) => {
  const note = (req.body?.note as string | undefined) ?? undefined;
  const n = await prisma.callbackRequest.updateMany({
    where: { id: req.params.id, tenantId: req.tenantId! },
    data: { status: "no_answer", ...(note !== undefined && { note }) },
  });
  if (n.count === 0) {
    sendResult(res, { ok: false, error: "Not found", code: "NOT_FOUND" });
    return;
  }
  sendResult(res, { ok: true, data: true });
});

callbacksRouter.post("/", async (req, res) => {
  const callerNumber = req.body?.callerNumber as string | undefined;
  if (!callerNumber) {
    res.status(422).json({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "callerNumber required",
    });
    return;
  }
  const row = await prisma.callbackRequest.create({
    data: {
      id: newId(),
      tenantId: req.tenantId!,
      callLogId: req.body?.callLogId as string | undefined,
      callerNumber,
      preferredTime: req.body?.preferredTime as string | undefined,
      status: "pending",
    },
  });
  sendResult(res, { ok: true, data: row });
});
