import { Router } from "express";
import { requireAuth, requireAdmin, sendResult } from "../middleware/auth.js";
import type { AuthRequest } from "../types/express.d.js";
import * as historical from "../services/historical.service.js";

export const historicalRouter = Router();
historicalRouter.use(requireAuth);

historicalRouter.get("/", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const productTypeId = req.query.productTypeId as string | undefined;
  if (!productTypeId) {
    const data = await historical.listAllHistoricalRecords(tenantId);
    res.json({ ok: true, data });
    return;
  }
  const data = await historical.listHistoricalAverages(tenantId, productTypeId);
  res.json({ ok: true, data });
});

historicalRouter.get("/lookup", async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const productTypeId = req.query.productTypeId as string | undefined;
  const teamId = req.query.teamId as string | undefined;
  if (!productTypeId) {
    res.status(400).json({ ok: false, error: "productTypeId は必須です" });
    return;
  }
  const r = await historical.lookupHistoricalAverage(
    tenantId,
    productTypeId,
    teamId ?? "",
  );
  sendResult(res, r);
});

historicalRouter.post("/", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const body = req.body ?? {};
  const r = await historical.createHistoricalAverage(tenantId, {
    productTypeId: body.productTypeId,
    projectNumber: body.projectNumber,
    clientName: body.clientName,
    bridgeName: body.bridgeName,
    completedAt: body.completedAt,
    teamId: body.teamId,
    manufacturingPlanned: body.manufacturingPlanned,
    salesPlanned: body.salesPlanned,
    weight: body.weight,
    assemblyPrepHours: body.assemblyPrepHours,
    assemblyHours: body.assemblyHours,
    weldingHours: body.weldingHours,
    distortionHours: body.distortionHours,
    paintingHours: body.paintingHours,
    finishingHours: body.finishingHours,
    totalHours: body.totalHours,
    projectCount: body.projectCount,
    memberLength: body.memberLength,
    weightPerMeter: body.weightPerMeter,
  });
  sendResult(res, r);
});

historicalRouter.put("/:id", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const body = req.body ?? {};
  const r = await historical.updateHistoricalAverage(tenantId, req.params.id!, {
    projectNumber: body.projectNumber,
    clientName: body.clientName,
    bridgeName: body.bridgeName,
    completedAt: body.completedAt,
    teamId: body.teamId,
    manufacturingPlanned: body.manufacturingPlanned,
    salesPlanned: body.salesPlanned,
    weight: body.weight,
    assemblyPrepHours: body.assemblyPrepHours,
    assemblyHours: body.assemblyHours,
    weldingHours: body.weldingHours,
    distortionHours: body.distortionHours,
    paintingHours: body.paintingHours,
    finishingHours: body.finishingHours,
    totalHours: body.totalHours,
    projectCount: body.projectCount,
    memberLength: body.memberLength,
    weightPerMeter: body.weightPerMeter,
  });
  sendResult(res, r);
});

historicalRouter.delete("/:id", requireAdmin, async (req, res) => {
  const tenantId = (req as AuthRequest).tenantId;
  const r = await historical.deleteHistoricalAverage(tenantId, req.params.id!);
  sendResult(res, r);
});
