import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { activeCallsStore, type ActiveCallEvent } from "../services/active-calls.service.js";

export const monitorRouter = Router();
monitorRouter.use(requireAuth);

monitorRouter.get("/active-calls", (req, res) => {
  const tenantId = req.tenantId!;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const current = activeCallsStore.getByTenant(tenantId);
  res.write(`data: ${JSON.stringify({ type: "init", calls: current })}\n\n`);

  const handler = (event: ActiveCallEvent) => {
    if ("tenantId" in event && event.tenantId !== tenantId) return;
    if (event.type === "call_started" && event.call.tenantId !== tenantId) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  activeCallsStore.events.on("change", handler);

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  req.on("close", () => {
    activeCallsStore.events.off("change", handler);
    clearInterval(heartbeat);
  });
});

monitorRouter.get("/active-calls-snapshot", (req, res) => {
  const calls = activeCallsStore.getByTenant(req.tenantId!);
  res.json({ ok: true, data: calls });
});
