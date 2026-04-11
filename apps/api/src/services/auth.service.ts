import type { Result } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { verifyIdToken } from "../lib/firebase-admin.js";

export async function verifyAuthToken(
  token: string,
): Promise<
  Result<{ userId: string; tenantId: string; role: string }>
> {
  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return { ok: false, error: "Invalid token", code: "UNAUTHORIZED" };
  }
  const user = await prisma.user.findUnique({
    where: { firebaseUid: decoded.uid },
  });
  if (!user) {
    return { ok: false, error: "User not found", code: "UNAUTHORIZED" };
  }
  return {
    ok: true,
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    },
  };
}
