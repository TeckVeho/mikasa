import { Router } from "express";
import { requireAuth, requireAdmin, sendResult } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import {
  createFirebaseUser,
  deleteFirebaseUser,
  generateResetLink,
} from "../lib/firebase-admin.js";
import { newId } from "../utils/id.js";

const VALID_ROLES = ["admin", "operator"] as const;
type Role = (typeof VALID_ROLES)[number];

function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && VALID_ROLES.includes(value as Role);
}

export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.use(requireAdmin);

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

usersRouter.post("/invite", async (req, res) => {
  const { email, role } = req.body ?? {};

  if (!email || typeof email !== "string") {
    sendResult(res, {
      ok: false,
      error: "email is required",
      code: "VALIDATION_ERROR",
    });
    return;
  }
  if (!isValidRole(role)) {
    sendResult(res, {
      ok: false,
      error: "role must be 'admin' or 'operator'",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    sendResult(res, {
      ok: false,
      error: "User with this email already exists",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const fbUser = await createFirebaseUser(email);
  const firebaseUid = fbUser?.uid ?? `dev_${newId()}`;

  const user = await prisma.user.create({
    data: {
      id: newId(),
      tenantId: req.tenantId!,
      email,
      firebaseUid,
      role,
    },
  });

  const resetLink = await generateResetLink(email);

  sendResult(res, {
    ok: true,
    data: { id: user.id, email: user.email, role: user.role, resetLink },
  });
});

usersRouter.patch("/:id/role", async (req, res) => {
  const { role } = req.body ?? {};

  if (!isValidRole(role)) {
    sendResult(res, {
      ok: false,
      error: "role must be 'admin' or 'operator'",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  if (req.userId === req.params.id) {
    sendResult(res, {
      ok: false,
      error: "Cannot change your own role",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const result = await prisma.user.updateMany({
    where: { id: req.params.id, tenantId: req.tenantId! },
    data: { role },
  });

  if (result.count === 0) {
    sendResult(res, {
      ok: false,
      error: "User not found",
      code: "NOT_FOUND",
    });
    return;
  }

  sendResult(res, { ok: true, data: true });
});

usersRouter.delete("/:id", async (req, res) => {
  if (req.userId === req.params.id) {
    sendResult(res, {
      ok: false,
      error: "Cannot delete yourself",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.tenantId! },
  });

  if (!user) {
    sendResult(res, {
      ok: false,
      error: "User not found",
      code: "NOT_FOUND",
    });
    return;
  }

  await deleteFirebaseUser(user.firebaseUid);
  await prisma.user.delete({ where: { id: user.id } });

  sendResult(res, { ok: true, data: true });
});
