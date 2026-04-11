import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import * as svc from "../services/call-log.service.js";

export const callsRouter = Router();

callsRouter.use(requireAuth);

callsRouter.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const r = await svc.listCalls(req.tenantId!, {
    page,
    limit,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    status: req.query.status as string | undefined,
    numberId: req.query.numberId as string | undefined,
    q: req.query.q as string | undefined,
  });
  sendResult(res, r);
});

callsRouter.get("/:id", async (req, res) => {
  const r = await svc.getCall(req.tenantId!, req.params.id);
  sendResult(res, r);
});

callsRouter.patch("/:id/note", async (req, res) => {
  const note = req.body?.operatorNote as string | undefined;
  if (note === undefined) {
    res.status(422).json({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "operatorNote required",
    });
    return;
  }
  const r = await svc.updateNote(req.tenantId!, req.params.id, note);
  sendResult(res, r);
});
