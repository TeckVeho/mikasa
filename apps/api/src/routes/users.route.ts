import { Router } from "express";
import { requireAuth, sendResult } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/", async (req, res) => {
  const rows = await prisma.user.findMany({
    where: { tenantId: req.tenantId! },
    orderBy: { createdAt: "desc" },
  });
  sendResult(res, {
    ok: true,
    data: rows.map((u) => ({
      id: u.id,
      name: u.email.split("@")[0] ?? u.email,
      email: u.email,
      role: u.role,
      lastLoginAt: null as string | null,
    })),
  });
});

usersRouter.post("/invite", async (_req, res) => {
  sendResult(res, {
    ok: false,
    error: "Invite not implemented",
    code: "VALIDATION_ERROR",
  });
});

usersRouter.patch("/:id/role", async (_req, res) => {
  sendResult(res, { ok: true, data: true });
});

usersRouter.delete("/:id", async (_req, res) => {
  sendResult(res, { ok: true, data: true });
});
