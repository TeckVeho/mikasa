import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function findScenariosForTenant(tenantId: string) {
  return prisma.scenario.findMany({
    where: { tenantId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { phoneNumbers: true } },
    },
  });
}

export async function findScenarioById(tenantId: string, id: string) {
  return prisma.scenario.findFirst({
    where: { id, tenantId },
  });
}

export async function createScenario(
  tenantId: string,
  data: { id: string; name: string; flowJson: Prisma.InputJsonValue },
) {
  return prisma.scenario.create({
    data: {
      id: data.id,
      tenantId,
      name: data.name,
      flowJson: data.flowJson,
      status: "draft",
    },
  });
}

export async function updateScenario(
  tenantId: string,
  id: string,
  data: { name?: string; flowJson?: Prisma.InputJsonValue },
) {
  return prisma.scenario.updateMany({
    where: { id, tenantId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function setScenarioPublished(tenantId: string, id: string) {
  return prisma.scenario.updateMany({
    where: { id, tenantId },
    data: {
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function deleteScenario(tenantId: string, id: string) {
  return prisma.scenario.deleteMany({
    where: { id, tenantId },
  });
}

export async function countPhoneNumbersUsingScenario(
  tenantId: string,
  scenarioId: string,
) {
  return prisma.phoneNumber.count({
    where: { tenantId, scenarioId },
  });
}
