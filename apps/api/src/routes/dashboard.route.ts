import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import type { AuthRequest } from "../types/express.d.js";
import * as daily from "../services/daily-record.service.js";
import { getDashboardSummary, getTeamDashboard } from "../services/dashboard.service.js";
import { getLoadChart, normalizeLoadChartView } from "../services/load-chart.service.js";
import { getAlerts } from "../services/historical.service.js";
import * as teamSchedule from "../services/team-schedule.service.js";
import { defaultDateRange } from "../utils/date.js";

export const dailyRouter = Router();
dailyRouter.use(requireAuth);

dailyRouter.get("/daily-records", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await daily.listDailyRecords(tenantId, {
    teamId: req.query.teamId as string | undefined,
    date: req.query.date as string | undefined,
    start: req.query.start as string | undefined,
    end: req.query.end as string | undefined,
  });
  res.json({ ok: true, data });
});

dailyRouter.post("/daily-records", async (req, res) => {
  const { tenantId, userId } = req as AuthRequest;
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  const r = await daily.upsertDailyRecords(tenantId, userId, records);
  sendResult(res, r);
});

dailyRouter.post("/daily-records/import", async (req, res) => {
  const { tenantId, userId } = req as AuthRequest;
  const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
  const r = await daily.importDailyRecordsFromCsv(tenantId, userId, csv);
  sendResult(res, r);
});

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await getDashboardSummary(tenantId);
  res.json({ ok: true, data });
});

dashboardRouter.get("/load-chart", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const range = defaultDateRange(3);
  const start = String(req.query.start ?? range.start);
  const end = String(req.query.end ?? range.end);
  const view = normalizeLoadChartView(String(req.query.view ?? "category"));
  const data = await getLoadChart(tenantId, start, end, view, {
    teamId: req.query.teamId as string | undefined,
  });
  res.json({ ok: true, data });
});

dashboardRouter.get("/teams/:teamId", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await getTeamDashboard(tenantId, req.params.teamId!);
  if (!data) {
    res.status(404).json({ ok: false, error: "NOT_FOUND", message: "班が見つかりません" });
    return;
  }
  res.json({ ok: true, data });
});

dashboardRouter.get("/teams/:teamId/schedule", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const now = new Date();
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const month = String(req.query.month ?? defaultMonth);
  const months = Number(req.query.months ?? 1);
  const data = await teamSchedule.getTeamSchedule(
    tenantId,
    req.params.teamId!,
    month,
    months,
  );
  if (!data) {
    res.status(404).json({ ok: false, error: "NOT_FOUND", message: "班が見つかりません" });
    return;
  }
  res.json({ ok: true, data });
});

dashboardRouter.post("/teams/:teamId/schedule/move", async (req, res) => {
  const { tenantId, userId } = req as AuthRequest;
  const r = await teamSchedule.moveScheduleRecord(
    tenantId,
    req.params.teamId!,
    userId,
    req.body,
  );
  sendResult(res, r);
});

dashboardRouter.post("/teams/:teamId/schedule/cell", async (req, res) => {
  const { tenantId, userId } = req as AuthRequest;
  const r = await teamSchedule.upsertScheduleCell(
    tenantId,
    req.params.teamId!,
    userId,
    req.body,
  );
  sendResult(res, r);
});

dashboardRouter.get("/alerts", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await getAlerts(tenantId);
  res.json({ ok: true, data });
});
