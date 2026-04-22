import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const transfersRouter = Router();
transfersRouter.use(requireAuth);

transfersRouter.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const where: Record<string, unknown> = { tenantId: req.tenantId! };
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.transferHandoff.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.transferHandoff.count({ where }),
  ]);

  res.json({ ok: true, data: { items, total, page, limit } });
});

transfersRouter.get("/:id", async (req, res) => {
  const row = await prisma.transferHandoff.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId! },
  });
  if (!row) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  res.json({ ok: true, data: row });
});

transfersRouter.patch("/:id/status", async (req, res) => {
  const newStatus = req.body?.status as string;
  if (!newStatus || !["handled", "escalated", "pending"].includes(newStatus)) {
    res.status(422).json({ ok: false, error: "VALIDATION_ERROR", message: "Invalid status" });
    return;
  }
  const n = await prisma.transferHandoff.updateMany({
    where: { id: req.params.id, tenantId: req.tenantId! },
    data: { status: newStatus },
  });
  if (n.count === 0) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  res.json({ ok: true, data: true });
});
