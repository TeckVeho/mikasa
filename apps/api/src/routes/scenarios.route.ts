import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import * as svc from "../services/scenario.service.js";

export const scenariosRouter = Router();

scenariosRouter.use(requireAuth);

scenariosRouter.get("/", async (req, res) => {
  const r = await svc.listScenarios(req.tenantId!);
  sendResult(res, r);
});

scenariosRouter.post("/", async (req, res) => {
  const r = await svc.createScenario(req.tenantId!, req.body);
  sendResult(res, r);
});

scenariosRouter.get("/:id", async (req, res) => {
  const r = await svc.getScenario(req.tenantId!, req.params.id);
  sendResult(res, r);
});

scenariosRouter.put("/:id", async (req, res) => {
  const r = await svc.updateScenario(req.tenantId!, req.params.id, req.body);
  sendResult(res, r);
});

scenariosRouter.post("/:id/publish", async (req, res) => {
  const r = await svc.publishScenario(req.tenantId!, req.params.id);
  sendResult(res, r);
});

scenariosRouter.post("/:id/duplicate", async (req, res) => {
  const r = await svc.duplicateScenario(req.tenantId!, req.params.id);
  sendResult(res, r);
});

scenariosRouter.delete("/:id", async (req, res) => {
  const r = await svc.deleteScenario(req.tenantId!, req.params.id);
  sendResult(res, r);
});
