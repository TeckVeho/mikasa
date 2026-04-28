import { Router } from "express";
import { requireAuth, requireAdmin, sendResult } from "../middleware/auth.js";
import * as svc from "../services/dashboard.service.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", requireAdmin, async (req, res) => {
  const period = (req.query.period as string) ?? "month";
  const r = await svc.dashboardSummary(
    req.tenantId!,
    period,
    req.query.from as string | undefined,
    req.query.to as string | undefined,
  );
  sendResult(res, r);
});

dashboardRouter.get("/daily-calls", requireAdmin, async (req, res) => {
  const days = Number(req.query.days) || 30;
  const r = await svc.dailyCalls(req.tenantId!, days);
  sendResult(res, r);
});

dashboardRouter.get("/hourly-distribution", requireAdmin, async (req, res) => {
  const r = await svc.hourlyDistribution(req.tenantId!);
  sendResult(res, r);
});

dashboardRouter.get("/by-scenario", requireAdmin, async (req, res) => {
  const r = await svc.dashboardByScenario(req.tenantId!);
  sendResult(res, r);
});

dashboardRouter.get("/by-number", requireAdmin, async (req, res) => {
  const r = await svc.dashboardByNumber(req.tenantId!);
  sendResult(res, r);
});

dashboardRouter.get("/cost-estimate", requireAdmin, async (req, res) => {
  const r = await svc.dashboardCostEstimate(req.tenantId!);
  sendResult(res, r);
});

dashboardRouter.get("/operator-summary", async (req, res) => {
  const r = await svc.operatorSummary(req.tenantId!);
  sendResult(res, r);
});
