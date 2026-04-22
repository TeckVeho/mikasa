import { Router } from "express";
import { verifyAuthToken } from "../services/auth.service.js";
import { requireAuth, sendResult } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const authRouter = Router();

authRouter.post("/verify", async (req, res) => {
  const token =
    (typeof req.body?.token === "string" ? req.body.token : undefined) ??
    req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(422).json({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "token required",
    });
    return;
  }
  const r = await verifyAuthToken(token);
  sendResult(res, r);
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, role: true, tenantId: true },
  });
  if (!user) {
    res.status(404).json({ ok: false, error: "NOT_FOUND", message: "User not found" });
    return;
  }
  res.json({ ok: true, data: user });
});
