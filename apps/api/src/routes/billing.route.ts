import { Router } from "express";
import { requireAuth, requireAdmin, sendResult } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const billingRouter = Router();
billingRouter.use(requireAuth);
billingRouter.use(requireAdmin);

billingRouter.get("/summary", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.tenantId! },
  });
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const logs = await prisma.callLog.findMany({
    where: { tenantId: req.tenantId!, createdAt: { gte: start } },
    select: { durationSeconds: true },
  });
  const totalMinutes =
    logs.reduce((a, l) => a + (l.durationSeconds ?? 0), 0) / 60;
  const estTwilio = Math.round(totalMinutes * 0.05 * 100) / 100;
  sendResult(res, {
    ok: true,
    data: {
      plan: tenant?.billingPlan ?? "standard",
      monthToDateCalls: logs.length,
      estimatedTwilioUsd: estTwilio,
      estimatedSttUsd: Math.round(logs.length * 0.02 * 100) / 100,
      estimatedTtsUsd: Math.round(logs.length * 0.01 * 100) / 100,
    },
  });
});
