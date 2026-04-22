import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { vocAnalyze } from "../lib/openai.js";

export const vocRouter = Router();
vocRouter.use(requireAuth);

vocRouter.get("/summary", async (req, res) => {
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const logs = await prisma.callLog.findMany({
    where: {
      tenantId: req.tenantId!,
      summaryText: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { summaryText: true },
  });
  const summaries = logs
    .map((l) => l.summaryText)
    .filter((s): s is string => Boolean(s));
  if (summaries.length === 0) {
    sendResult(res, {
      ok: true,
      data: { topics: [], faqCandidates: [], sentiment: "neutral" },
    });
    return;
  }
  const r = await vocAnalyze({ summaries });
  sendResult(res, r);
});
