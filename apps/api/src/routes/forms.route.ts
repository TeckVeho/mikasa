import { Router } from "express";
import { prisma } from "../lib/prisma.js";

/** Public form API (token = call log id for MVP). */
export const formsRouter = Router();

formsRouter.get("/:token", async (req, res) => {
  const id = req.params.token;
  const log = await prisma.callLog.findFirst({
    where: { id },
    select: {
      id: true,
      structuredData: true,
      callerNumber: true,
      transcriptText: true,
    },
  });
  if (!log) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  res.json({ ok: true, data: log });
});

formsRouter.patch("/:token", async (req, res) => {
  const id = req.params.token;
  const structuredData = req.body?.structuredData;
  if (structuredData === undefined) {
    res.status(422).json({ ok: false, error: "structuredData required" });
    return;
  }
  const n = await prisma.callLog.updateMany({
    where: { id },
    data: { structuredData },
  });
  if (n.count === 0) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  res.json({ ok: true, data: true });
});
