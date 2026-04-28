import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireSuperAdmin,
  sendResult,
} from "../middleware/auth.js";
import {
  createFirebaseUser,
  generateResetLink,
} from "../lib/firebase-admin.js";
import { newId } from "../utils/id.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireSuperAdmin);

adminRouter.get("/tenants", async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true, callLogs: true },
      },
    },
  });
  res.json({
    ok: true,
    data: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      billingPlan: t.billingPlan,
      voiceEngine: t.voiceEngine,
      createdAt: t.createdAt.toISOString(),
      userCount: t._count.users,
      callLogCount: t._count.callLogs,
    })),
  });
});

adminRouter.get("/tenants/:id", async (req, res) => {
  const t = await prisma.tenant.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      _count: {
        select: { users: true, callLogs: true, phoneNumbers: true },
      },
    },
  });
  if (!t) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  res.json({
    ok: true,
    data: {
      id: t.id,
      name: t.name,
      billingPlan: t.billingPlan,
      voiceEngine: t.voiceEngine,
      maintenanceMode: t.maintenanceMode,
      maintenanceMessage: t.maintenanceMessage,
      createdAt: t.createdAt.toISOString(),
      userCount: t._count.users,
      callLogCount: t._count.callLogs,
      phoneNumberCount: t._count.phoneNumbers,
    },
  });
});

adminRouter.post("/tenants", async (req, res) => {
  const name = req.body?.name as string | undefined;
  const adminEmail = req.body?.adminEmail as string | undefined;
  const billingPlan = (req.body?.billingPlan as string) ?? "standard";

  if (!name || typeof name !== "string") {
    sendResult(res, {
      ok: false,
      error: "name is required",
      code: "VALIDATION_ERROR",
    });
    return;
  }
  if (!adminEmail || typeof adminEmail !== "string") {
    sendResult(res, {
      ok: false,
      error: "adminEmail is required",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    sendResult(res, {
      ok: false,
      error: "User with this email already exists",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const tenantId = newId();
  const fbUser = await createFirebaseUser(adminEmail);
  const firebaseUid = fbUser?.uid ?? `dev_${newId()}`;

  await prisma.$transaction([
    prisma.tenant.create({
      data: {
        id: tenantId,
        name,
        billingPlan,
      },
    }),
    prisma.user.create({
      data: {
        id: newId(),
        tenantId,
        email: adminEmail,
        firebaseUid,
        role: "admin",
      },
    }),
  ]);

  const resetLink = await generateResetLink(adminEmail);

  res.json({
    ok: true,
    data: {
      tenantId,
      adminEmail,
      resetLink,
    },
  });
});

adminRouter.patch("/tenants/:id", async (req, res) => {
  const name = req.body?.name as string | undefined;
  const billingPlan = req.body?.billingPlan as string | undefined;

  const data: { name?: string; billingPlan?: string } = {};
  if (name !== undefined) data.name = name;
  if (billingPlan !== undefined) data.billingPlan = billingPlan;
  if (Object.keys(data).length === 0) {
    sendResult(res, {
      ok: false,
      error: "no fields to update",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const existing = await prisma.tenant.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!existing) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  const t = await prisma.tenant.update({
    where: { id: existing.id },
    data,
  });
  res.json({
    ok: true,
    data: { id: t.id, name: t.name, billingPlan: t.billingPlan },
  });
});

adminRouter.delete("/tenants/:id", async (req, res) => {
  const n = await prisma.tenant.updateMany({
    where: { id: req.params.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (n.count === 0) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  res.json({ ok: true, data: true });
});

adminRouter.get("/tenants/:id/usage", async (req, res) => {
  const tenantId = req.params.id;
  const t = await prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
  });
  if (!t) {
    res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return;
  }
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const logs = await prisma.callLog.findMany({
    where: { tenantId, createdAt: { gte: start } },
    select: { durationSeconds: true },
  });
  const totalMinutes =
    logs.reduce((a, l) => a + (l.durationSeconds ?? 0), 0) / 60;
  res.json({
    ok: true,
    data: {
      monthToDateCalls: logs.length,
      totalMinutes: Math.round(totalMinutes * 10) / 10,
    },
  });
});
