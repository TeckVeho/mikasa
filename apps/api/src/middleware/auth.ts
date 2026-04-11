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
  if (process.env.NODE_ENV !== "production" && typeof devTenant === "string") {
    req.tenantId = devTenant;
    req.userId = (req.headers["x-dev-user-id"] as string) ?? "dev-user";
    req.userRole = "admin";
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
  });
  if (!user) {
    res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: "User not registered" });
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
