import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import * as svc from "../services/phone-number.service.js";

export const numbersRouter = Router();

numbersRouter.use(requireAuth);

numbersRouter.get("/available", async (_req, res) => {
  const r = await svc.availableNumbers();
  sendResult(res, r);
});

numbersRouter.get("/", async (req, res) => {
  const r = await svc.listNumbers(req.tenantId!);
  sendResult(res, r);
});

numbersRouter.get("/:id", async (req, res) => {
  const r = await svc.getNumber(req.tenantId!, req.params.id);
  sendResult(res, r);
});

numbersRouter.post("/", async (req, res) => {
  if (req.body?.phoneNumber && !req.body?.twilioNumberSid) {
    const r = await svc.purchaseAndAdd(req.tenantId!, req.body.phoneNumber as string);
    sendResult(res, r);
    return;
  }
  const r = await svc.addNumber(req.tenantId!, req.body);
  sendResult(res, r);
});

numbersRouter.delete("/:id", async (req, res) => {
  const r = await svc.deleteNumber(req.tenantId!, req.params.id);
  sendResult(res, r);
});

numbersRouter.patch("/:id/scenario", async (req, res) => {
  const scenarioId = req.body?.scenarioId as string | undefined;
  if (!scenarioId) {
    res.status(422).json({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "scenarioId required",
    });
    return;
  }
  const r = await svc.patchScenario(req.tenantId!, req.params.id, scenarioId);
  sendResult(res, r);
});

numbersRouter.patch("/:id/status", async (req, res) => {
  const status = req.body?.status as string | undefined;
  if (!status) {
    res.status(422).json({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "status required",
    });
    return;
  }
  const r = await svc.patchStatus(req.tenantId!, req.params.id, status);
  sendResult(res, r);
});

numbersRouter.post("/byoc", async (req, res) => {
  const phoneNumber = req.body?.phoneNumber as string | undefined;
  if (!phoneNumber) {
    res.status(422).json({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "phoneNumber required",
    });
    return;
  }
  const r = await svc.addByocNumber(req.tenantId!, phoneNumber);
  sendResult(res, r);
});

numbersRouter.get("/:id/ivr", async (req, res) => {
  const r = await svc.getIvrSettings(req.tenantId!, req.params.id);
  sendResult(res, r);
});

numbersRouter.put("/:id/ivr", async (req, res) => {
  const r = await svc.updateIvrSettings(req.tenantId!, req.params.id, req.body);
  sendResult(res, r);
});
