import { vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { adminUser, operatorUser, userById } from "./fixtures.js";

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

type FindUniqueArgs = Prisma.UserFindUniqueArgs;

function resolveUser(where: Prisma.UserWhereUniqueInput) {
  if (where.id != null) return userById(where.id);
  if (where.firebaseUid != null) {
    if (where.firebaseUid === adminUser.firebaseUid) return adminUser;
    if (where.firebaseUid === operatorUser.firebaseUid) return operatorUser;
  }
  return null;
}

export function resetPrismaMock(): void {
  vi.mocked(prismaMock.user.findUnique).mockImplementation(async (args: FindUniqueArgs) => {
    const user = resolveUser(args.where);
    if (!user) return null;
    if (args.include?.tenant) return user;
    if (!args.select) return user;
    const picked: Record<string, unknown> = {};
    for (const key of Object.keys(args.select)) {
      if (args.select[key as keyof typeof args.select]) {
        picked[key] = user[key as keyof typeof user];
      }
    }
    return picked;
  });

  vi.mocked(prismaMock.user.findMany).mockResolvedValue([]);
  vi.mocked(prismaMock.user.findFirst).mockResolvedValue(null);
  vi.mocked(prismaMock.user.update).mockImplementation(async (args: Prisma.UserUpdateArgs) => ({
    ...adminUser,
    id: args.where.id ?? adminUser.id,
  }));
  vi.mocked(prismaMock.tenant.findFirst).mockResolvedValue(null);
}

resetPrismaMock();
