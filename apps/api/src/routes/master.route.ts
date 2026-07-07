import { Router } from "express";
import { requireAuth, requireAdmin, sendResult } from "../middleware/auth.js";
import type { AuthRequest } from "../types/express.d.js";
import * as master from "../services/master.service.js";

export const masterRouter = Router();
masterRouter.use(requireAuth);

masterRouter.get("/product-types", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await master.listProductTypes(tenantId);
  res.json({ ok: true, data });
});

masterRouter.post("/product-types", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.createProductType(tenantId, req.body);
  sendResult(res, r);
});

masterRouter.put("/product-types/:id", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.updateProductType(tenantId, req.params.id!, req.body);
  sendResult(res, r);
});

masterRouter.delete("/product-types/:id", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.deleteProductType(tenantId, req.params.id!);
  sendResult(res, r);
});

masterRouter.get("/process-types", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await master.listProcessTypes(tenantId);
  res.json({ ok: true, data });
});

masterRouter.put("/process-types/:id", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.updateProcessType(tenantId, req.params.id!, req.body);
  sendResult(res, r);
});

masterRouter.get("/teams", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await master.listTeams(tenantId);
  res.json({ ok: true, data });
});

masterRouter.post("/teams", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.createTeam(tenantId, req.body);
  sendResult(res, r);
});

masterRouter.put("/teams/:id", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.updateTeam(tenantId, req.params.id!, req.body);
  sendResult(res, r);
});

masterRouter.delete("/teams/:id", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.deleteTeam(tenantId, req.params.id!);
  sendResult(res, r);
});

masterRouter.get("/teams/:id/members", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await master.listTeamMembers(req.params.id!, tenantId);
  if (!data) {
    res.status(404).json({ ok: false, error: "NOT_FOUND", message: "班が見つかりません" });
    return;
  }
  res.json({ ok: true, data });
});

masterRouter.post("/teams/:id/members", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.addTeamMember(req.params.id!, tenantId, req.body);
  sendResult(res, r);
});

masterRouter.put("/teams/:teamId/members/:memberId", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.updateTeamMember(
    req.params.teamId!,
    tenantId,
    req.params.memberId!,
    req.body,
  );
  sendResult(res, r);
});

masterRouter.delete("/teams/:teamId/members/:memberId", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.removeTeamMember(
    req.params.teamId!,
    tenantId,
    req.params.memberId!,
  );
  sendResult(res, r);
});

masterRouter.get("/calendar", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const start = String(req.query.start ?? "");
  const end = String(req.query.end ?? "");
  if (!start || !end) {
    res.status(422).json({ ok: false, error: "VALIDATION_ERROR", message: "start, end required" });
    return;
  }
  const data = await master.getCalendar(tenantId, start, end);
  res.json({ ok: true, data });
});

masterRouter.put("/calendar", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const days = Array.isArray(req.body?.days) ? req.body.days : [];
  const r = await master.upsertCalendarDays(tenantId, days);
  sendResult(res, r);
});

masterRouter.get("/capacity-settings", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const data = await master.listCapacitySettings(tenantId);
  res.json({ ok: true, data });
});

masterRouter.put("/capacity-settings", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await master.upsertCapacitySetting(tenantId, req.body);
  sendResult(res, r);
});
