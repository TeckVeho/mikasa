import type { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      userRole?: string;
    }
  }
}

export type AuthRequest = Request & {
  tenantId: string;
  userId: string;
  userRole: string;
};
