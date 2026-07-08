import { Router } from "express";
import { requireAuth, requireAdmin, sendResult } from "../middleware/auth.js";
import type { AuthRequest } from "../types/express.d.js";
import * as project from "../services/project.service.js";
import { getProjectProgress } from "../services/progress.service.js";
import * as model from "../services/model.service.js";
import * as scheduleModel from "../services/schedule-model.service.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.get("/", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const excludeShipped = req.query.excludeShipped !== "false";
  const unassignedOnly = req.query.unassignedOnly === "true";
  const data = await project.listProjects(tenantId, {
    teamId: req.query.teamId as string | undefined,
    unassignedOnly,
    status: req.query.status as string | undefined,
    category: req.query.category as string | undefined,
    search: req.query.search as string | undefined,
    excludeShipped,
  });
  res.json({ ok: true, data });
});

projectsRouter.post("/", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const userId = (req as AuthRequest).userId;
  const r = await project.createProject(tenantId, { ...req.body, userId });
  sendResult(res, r);
});

projectsRouter.post("/import", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
  const rows = project.parseCsvImport(csv);
  const r = await project.importProjects(tenantId, rows);
  sendResult(res, r);
});

projectsRouter.get("/:id", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await project.getProject(tenantId, req.params.id!);
  if (!data) {
    res.status(404).json({ ok: false, error: "NOT_FOUND", message: "工事が見つかりません" });
    return;
  }
  res.json({ ok: true, data });
});

projectsRouter.put("/:id", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await project.updateProject(tenantId, req.params.id!, req.body);
  sendResult(res, r);
});

projectsRouter.post("/:id/model-preview", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const weight = Number(req.body?.weight);
  const memberLength = Number(req.body?.memberLength);
  const r = await model.previewProjectModel(
    tenantId,
    req.params.id!,
    weight,
    memberLength,
  );
  sendResult(res, r);
});

projectsRouter.post("/:id/apply-model", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const userId = (req as AuthRequest).userId;
  const weight = Number(req.body?.weight);
  const memberLength = Number(req.body?.memberLength);
  const startDate =
    typeof req.body?.startDate === "string" && req.body.startDate.trim()
      ? req.body.startDate.trim()
      : undefined;

  const r = await model.applyProjectModel(
    tenantId,
    req.params.id!,
    weight,
    memberLength,
  );
  if (!r.ok) {
    sendResult(res, r);
    return;
  }

  if (startDate) {
    const scheduleResult = await scheduleModel.applyScheduleModelToProject(
      tenantId,
      req.params.id!,
      startDate,
      userId,
    );
    if (!scheduleResult.ok) {
      sendResult(res, scheduleResult);
      return;
    }
  }

  sendResult(res, r);
});

projectsRouter.post("/:id/schedule-preview", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const startDate = String(req.body?.startDate ?? "");
  const plannedHours = Number(req.body?.plannedHours);
  const r = await scheduleModel.previewScheduleApply(
    tenantId,
    plannedHours,
    startDate,
  );
  sendResult(res, r);
});

projectsRouter.post("/:id/apply-schedule", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const userId = (req as AuthRequest).userId;
  const startDate = String(req.body?.startDate ?? "");
  const r = await scheduleModel.applyScheduleModelToProject(
    tenantId,
    req.params.id!,
    startDate,
    userId,
  );
  sendResult(res, r);
});

projectsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await project.deleteProject(tenantId, req.params.id!);
  sendResult(res, r);
});

projectsRouter.get("/:id/progress", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await getProjectProgress(tenantId, req.params.id!);
  if (!data) {
    res.status(404).json({ ok: false, error: "NOT_FOUND", message: "工事が見つかりません" });
    return;
  }
  res.json({ ok: true, data });
});

projectsRouter.get("/:id/schedule", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const now = new Date();
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const month = String(req.query.month ?? defaultMonth);
  const months = Number(req.query.months ?? 1);
  const { getProjectSchedule } = await import("../services/project-schedule.service.js");
  const data = await getProjectSchedule(tenantId, req.params.id!, month, months);
  if (!data) {
    res.status(404).json({ ok: false, error: "NOT_FOUND", message: "工事が見つかりません" });
    return;
  }
  res.json({ ok: true, data });
});

projectsRouter.post("/:id/schedule/cell", async (req, res) => {
  const { tenantId, userId } = req as AuthRequest;
  const { upsertProjectScheduleCell } = await import("../services/project-schedule.service.js");
  const r = await upsertProjectScheduleCell(tenantId, req.params.id!, userId, req.body);
  sendResult(res, r);
});
