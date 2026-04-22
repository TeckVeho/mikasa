import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function findScenariosForTenant(
  tenantId: string,
  scenarioType?: string,
) {
  return prisma.scenario.findMany({
    where: {
      tenantId,
      ...(scenarioType ? { scenarioType } : {}),
    },
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
  data: {
    id: string;
    name: string;
    flowJson: Prisma.InputJsonValue;
    scenarioType?: string;
    description?: string | null;
  },
) {
  return prisma.scenario.create({
    data: {
      id: data.id,
      tenantId,
      name: data.name,
      flowJson: data.flowJson,
      status: "draft",
      scenarioType: data.scenarioType ?? "inbound",
      description: data.description ?? null,
    },
  });
}

export async function updateScenario(
  tenantId: string,
  id: string,
  data: {
    name?: string;
    flowJson?: Prisma.InputJsonValue;
    scenarioType?: string;
    description?: string | null;
  },
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

export async function countScenarioVersions(scenarioId: string) {
  return prisma.scenarioVersion.count({ where: { scenarioId } });
}

export async function createScenarioVersion(data: {
  id: string;
  scenarioId: string;
  version: number;
  flowJson: Prisma.InputJsonValue;
  publishedBy?: string | null;
}) {
  return prisma.scenarioVersion.create({
    data: {
      id: data.id,
      scenarioId: data.scenarioId,
      version: data.version,
      flowJson: data.flowJson,
      publishedBy: data.publishedBy ?? null,
    },
  });
}

export async function listScenarioVersions(scenarioId: string) {
  return prisma.scenarioVersion.findMany({
    where: { scenarioId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      publishedAt: true,
      publishedBy: true,
    },
  });
}

export async function findScenarioVersion(
  scenarioId: string,
  version: number,
) {
  return prisma.scenarioVersion.findFirst({
    where: { scenarioId, version },
  });
}
