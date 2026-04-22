import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";

export const dictionaryRouter = Router();
dictionaryRouter.use(requireAuth);

dictionaryRouter.get("/", async (req, res) => {
  const rows = await prisma.speechDictionary.findMany({
    where: { tenantId: req.tenantId! },
    orderBy: { createdAt: "desc" },
  });
  sendResult(res, { ok: true, data: rows });
});

dictionaryRouter.post("/", async (req, res) => {
  const word = req.body?.word as string | undefined;
  const reading = req.body?.reading as string | undefined;
  const category = (req.body?.category as string) ?? "general";
  if (!word || !reading) {
    res.status(422).json({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "word and reading required",
    });
    return;
  }
  const row = await prisma.speechDictionary.create({
    data: {
      id: newId(),
      tenantId: req.tenantId!,
      word,
      reading,
      category,
    },
  });
  sendResult(res, { ok: true, data: row });
});

dictionaryRouter.delete("/:id", async (req, res) => {
  const n = await prisma.speechDictionary.deleteMany({
    where: { id: req.params.id, tenantId: req.tenantId! },
  });
  if (n.count === 0) {
    sendResult(res, { ok: false, error: "Not found", code: "NOT_FOUND" });
    return;
  }
  sendResult(res, { ok: true, data: true });
});
