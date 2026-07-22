import { vi } from "vitest";
import { adminUser, userById } from "./fixtures.js";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";

export const prismaMock = prisma;

export function resetPrismaMock(): void {
  vi.mocked(prismaMock.user.findUnique).mockImplementation(async (args: {
    where: { id?: string; firebaseUid?: string };
    include?: { tenant: boolean };
    select?: Record<string, boolean>;
  }) => {
    const user =
      args.where.id != null
        ? userById(args.where.id)
        : null;
    if (!user) return null;
    if (args.include?.tenant) return user;
    if (!args.select) return user;
    const picked: Record<string, unknown> = {};
    for (const key of Object.keys(args.select)) {
      if (args.select[key]) {
        picked[key] = user[key as keyof typeof user];
      }
    }
    return picked;
  });

  vi.mocked(prismaMock.user.findMany).mockResolvedValue([]);
  vi.mocked(prismaMock.user.findFirst).mockResolvedValue(null);
  vi.mocked(prismaMock.user.update).mockImplementation(async (args: {
    where: { id: string };
  }) => ({
    ...adminUser,
    id: args.where.id,
  }));
  vi.mocked(prismaMock.tenant.findFirst).mockResolvedValue(null);
}

resetPrismaMock();
