import type { Result } from "@logivoice/shared";
import { flowJsonSchema } from "@logivoice/shared";
import type { Prisma } from "@prisma/client";
import { newId } from "../utils/id.js";
import * as repo from "../repositories/scenario.repo.js";
import { findEntryNodeId } from "./flow-graph.js";

export async function listScenarios(
  tenantId: string,
  scenarioType?: string,
): Promise<Result<unknown[]>> {
  const rows = await repo.findScenariosForTenant(tenantId, scenarioType);
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      scenarioType: r.scenarioType,
      description: r.description,
      linkedNumberCount: r._count.phoneNumbers,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

export async function getScenario(
  tenantId: string,
  id: string,
): Promise<Result<unknown>> {
  const r = await repo.findScenarioById(tenantId, id);
  if (!r) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  return {
    ok: true,
    data: {
      id: r.id,
      name: r.name,
      flowJson: r.flowJson,
      status: r.status,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
      scenarioType: r.scenarioType,
      description: r.description,
    },
  };
}

export async function createScenario(
  tenantId: string,
  body: {
    name: string;
    flowJson: unknown;
    scenarioType?: string;
    description?: string | null;
  },
): Promise<Result<unknown>> {
  const parsed = flowJsonSchema.safeParse(body.flowJson);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }
  const id = newId();
  const r = await repo.createScenario(tenantId, {
    id,
    name: body.name,
    flowJson: parsed.data as unknown as Prisma.InputJsonValue,
    scenarioType: body.scenarioType,
    description: body.description,
  });
  return { ok: true, data: { id: r.id } };
}

export async function updateScenario(
  tenantId: string,
  id: string,
  body: {
    name: string;
    flowJson: unknown;
    scenarioType?: string;
    description?: string | null;
  },
): Promise<Result<unknown>> {
  const parsed = flowJsonSchema.safeParse(body.flowJson);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }
  const n = await repo.updateScenario(tenantId, id, {
    name: body.name,
    flowJson: parsed.data as unknown as Prisma.InputJsonValue,
    scenarioType: body.scenarioType,
    description: body.description,
  });
  if (n.count === 0) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  return { ok: true, data: { id } };
}

function validateFlowForPublish(flow: import("@logivoice/shared").FlowJson): Result<true> {
  const entry = findEntryNodeId(flow);
  if (!entry) {
    return {
      ok: false,
      error: "エントリノードがありません",
      code: "SCENARIO_PUBLISH_FAILED",
    };
  }
  return { ok: true, data: true };
}

export async function publishScenario(
  tenantId: string,
  id: string,
): Promise<Result<unknown>> {
  const r = await repo.findScenarioById(tenantId, id);
  if (!r) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  const parsed = flowJsonSchema.safeParse(r.flowJson);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.message,
      code: "SCENARIO_PUBLISH_FAILED",
    };
  }
  const v = validateFlowForPublish(parsed.data);
  if (!v.ok) return v;
  const nextVersion = (await repo.countScenarioVersions(id)) + 1;
  await repo.createScenarioVersion({
    id: newId(),
    scenarioId: id,
    version: nextVersion,
    flowJson: r.flowJson as Prisma.InputJsonValue,
    publishedBy: null,
  });
  await repo.setScenarioPublished(tenantId, id);
  return { ok: true, data: { id, status: "published", version: nextVersion } };
}

export async function duplicateScenario(
  tenantId: string,
  id: string,
): Promise<Result<unknown>> {
  const r = await repo.findScenarioById(tenantId, id);
  if (!r) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  const newScenarioId = newId();
  await repo.createScenario(tenantId, {
    id: newScenarioId,
    name: `${r.name} のコピー`,
    flowJson: r.flowJson as Prisma.InputJsonValue,
    scenarioType: r.scenarioType,
    description: r.description,
  });
  return { ok: true, data: { id: newScenarioId } };
}

export async function deleteScenario(
  tenantId: string,
  id: string,
): Promise<Result<unknown>> {
  const n = await repo.deleteScenario(tenantId, id);
  if (n.count === 0) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  return { ok: true, data: true };
}

export async function listScenarioVersions(
  tenantId: string,
  scenarioId: string,
): Promise<Result<unknown>> {
  const s = await repo.findScenarioById(tenantId, scenarioId);
  if (!s) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  const rows = await repo.listScenarioVersions(scenarioId);
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      version: r.version,
      publishedAt: r.publishedAt.toISOString(),
      publishedBy: r.publishedBy,
    })),
  };
}

export async function restoreScenarioVersion(
  tenantId: string,
  scenarioId: string,
  version: number,
): Promise<Result<unknown>> {
  const s = await repo.findScenarioById(tenantId, scenarioId);
  if (!s) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  const v = await repo.findScenarioVersion(scenarioId, version);
  if (!v) return { ok: false, error: "Version not found", code: "NOT_FOUND" };
  const parsed = flowJsonSchema.safeParse(v.flowJson);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }
  await repo.updateScenario(tenantId, scenarioId, {
    flowJson: parsed.data as unknown as Prisma.InputJsonValue,
  });
  return { ok: true, data: { id: scenarioId, restoredVersion: version } };
}
