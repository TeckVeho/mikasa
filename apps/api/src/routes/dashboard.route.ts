import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import * as svc from "../services/dashboard.service.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (req, res) => {
  const period = (req.query.period as string) ?? "month";
  const r = await svc.dashboardSummary(
    req.tenantId!,
    period,
    req.query.from as string | undefined,
    req.query.to as string | undefined,
  );
  sendResult(res, r);
});

dashboardRouter.get("/daily-calls", async (req, res) => {
  const days = Number(req.query.days) || 30;
  const r = await svc.dailyCalls(req.tenantId!, days);
  sendResult(res, r);
});

dashboardRouter.get("/hourly-distribution", async (req, res) => {
  const r = await svc.hourlyDistribution(req.tenantId!);
  sendResult(res, r);
});
