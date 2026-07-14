import type { NextFunction, Request, Response } from "express";
import { verifyIdToken } from "../lib/firebase-admin.js";
import { prisma } from "../lib/prisma.js";
import type { Result } from "@logivoice/shared";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  // Dev bypass: X-Dev-Tenant-Id + optional X-Dev-User-Id (no Firebase)
  const devTenant = req.headers["x-dev-tenant-id"];
  const allowDevAuth =
    process.env.ALLOW_DEV_AUTH === "true" ||
    process.env.NODE_ENV !== "production";
  if (allowDevAuth && typeof devTenant === "string") {
    const devUserId = (req.headers["x-dev-user-id"] as string) ?? "dev-user";
    const devUser = await prisma.user.findUnique({
      where: { id: devUserId },
      include: { tenant: true },
    });
    if (!devUser || devUser.tenant.deletedAt) {
      res.status(403).json({
        ok: false,
        error: "FORBIDDEN",
        message: "テナントが無効か、ユーザーが存在しません",
      });
      return;
    }
    if (devUser.tenantId !== devTenant) {
      res.status(403).json({
        ok: false,
        error: "FORBIDDEN",
        message: "テナントIDが一致しません",
      });
      return;
    }
    req.tenantId = devUser.tenantId;
    req.userId = devUser.id;
    req.userRole = devUser.role;
    next();
    return;
  }

  if (!token) {
    res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Missing token" });
    return;
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "Invalid token" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { firebaseUid: decoded.uid },
    include: { tenant: true },
  });
  if (!user) {
    res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "User not registered" });
    return;
  }
  if (user.tenant.deletedAt) {
    res.status(403).json({
      ok: false,
      error: "FORBIDDEN",
      message: "このテナントは利用停止されています",
    });
    return;
  }

  req.tenantId = user.tenantId;
  req.userId = user.id;
  req.userRole = user.role;
  next();
}

export function sendResult<T>(res: Response, result: Result<T>): void {
  if (result.ok) {
    res.json({ ok: true, data: result.data });
  } else {
    const code = result.code ?? "INTERNAL_ERROR";
    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "FORBIDDEN"
          ? 403
          : code === "UNAUTHORIZED"
            ? 401
            : code === "VALIDATION_ERROR" || code === "SCENARIO_PUBLISH_FAILED"
              ? 422
              : code === "TWILIO_ERROR" || code === "OPENAI_ERROR"
                ? 502
                : 500;
    res.status(status).json({
      ok: false,
      error: code,
      message: result.error,
    });
  }
}

/** ロールのいずれかが必要（例: requireRole("admin", "superadmin")） */
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.userRole ?? "";
    if (!allowed.includes(role)) {
      res.status(403).json({
        ok: false,
        error: "FORBIDDEN",
        message: "権限がありません",
      });
      return;
    }
    next();
  };
}

/** テナント管理者またはプラットフォーム管理者 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireRole("admin", "superadmin")(req, res, next);
}

/** プラットフォーム管理者のみ */
export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireRole("superadmin")(req, res, next);
}
