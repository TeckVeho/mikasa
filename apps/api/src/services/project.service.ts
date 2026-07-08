import { Prisma } from "@prisma/client";
import type { ProjectListItemDto, ProjectStatus, Result } from "@logivoice/shared";
import { UNASSIGNED_TEAM_ID } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import { toNumber } from "../utils/decimal.js";
import { parseDateOnly, formatDateOnly } from "../utils/date.js";

type ProjectFilters = {
  teamId?: string;
  unassignedOnly?: boolean;
  status?: string;
  excludeShipped?: boolean;
  category?: string;
  search?: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mapProjectBase(
  p: {
    id: string;
    projectNumber: string;
    clientName: string | null;
    projectName: string;
    productTypeId: string | null;
    deadline: Date | null;
    weight: Prisma.Decimal | null;
    memberLength: Prisma.Decimal | null;
    drawingReceivedAt: Date | null;
    plannedHours: Prisma.Decimal | null;
    weldingRatio: Prisma.Decimal | null;
    teamId: string | null;
    status: string;
    category: string | null;
    setCount: number | null;
    detail: string | null;
    pastAverageHours: Prisma.Decimal | null;
    scheduleStartDate: Date | null;
    productType?: { name: string } | null;
    team?: { name: string } | null;
  },
  extras?: { progressRate?: number; variance?: number },
) {
  return {
    id: p.id,
    projectNumber: p.projectNumber,
    clientName: p.clientName,
    projectName: p.projectName,
    productTypeId: p.productTypeId,
    productTypeName: p.productType?.name ?? null,
    deadline: p.deadline ? formatDateOnly(p.deadline) : null,
    weight: toNumber(p.weight),
    memberLength: toNumber(p.memberLength),
    drawingReceivedAt: p.drawingReceivedAt
      ? formatDateOnly(p.drawingReceivedAt)
      : null,
    plannedHours: toNumber(p.plannedHours),
    weldingRatio: toNumber(p.weldingRatio),
    teamId: p.teamId,
    teamName: p.team?.name ?? null,
    status: p.status as ProjectStatus,
    category: p.category as "shinshuku" | "shinshuku_gai" | "kyotai" | null,
    setCount: p.setCount,
    detail: p.detail,
    pastAverageHours: toNumber(p.pastAverageHours),
    scheduleStartDate: p.scheduleStartDate
      ? formatDateOnly(p.scheduleStartDate)
      : null,
    progressRate: extras?.progressRate,
    variance: extras?.variance,
  };
}

function buildListItem(
  p: Parameters<typeof mapProjectBase>[0] & {
    processRecords: { processTypeId: string; hours: Prisma.Decimal }[];
  },
  processTypes: { id: string; name: string; isWelding: boolean }[],
): ProjectListItemDto {
  const planned = toNumber(p.plannedHours) ?? 0;
  const weldingRatio = toNumber(p.weldingRatio) ?? 0.2;

  const recordsByProcess = new Map<string, number>();
  for (const r of p.processRecords) {
    const current = recordsByProcess.get(r.processTypeId) ?? 0;
    recordsByProcess.set(r.processTypeId, current + (toNumber(r.hours) ?? 0));
  }

  const processSummary: Record<string, number> = {};
  for (const pt of processTypes) {
    processSummary[pt.name] = round2(recordsByProcess.get(pt.id) ?? 0);
  }

  const totalActualHours = round2(
    Array.from(recordsByProcess.values()).reduce((s, v) => s + v, 0),
  );
  const progressRate = planned > 0 ? round2((totalActualHours / planned) * 100) : 0;
  const variance = round2(planned - totalActualHours);

  const weldingTarget = round2(planned * weldingRatio);
  const weldingActual = round2(
    processTypes
      .filter((pt) => pt.isWelding)
      .reduce((s, pt) => s + (recordsByProcess.get(pt.id) ?? 0), 0),
  );
  const forgingTarget = round2(planned - weldingTarget);
  const forgingActual = round2(totalActualHours - weldingActual);

  const forecastHours =
    progressRate > 0 ? round2((totalActualHours / progressRate) * 100) : null;
  const forecastVariance =
    forecastHours != null ? round2(planned - forecastHours) : null;

  const base = mapProjectBase(p, { progressRate, variance });

  return {
    ...base,
    totalActualHours,
    forgingTarget,
    forgingActual,
    forgingVariance: round2(forgingTarget - forgingActual),
    weldingTarget,
    weldingActual,
    weldingVariance: round2(weldingTarget - weldingActual),
    processSummary,
    forecastHours,
    forecastVariance,
  };
}

export async function listProjects(
  tenantId: string,
  filters: ProjectFilters = {},
): Promise<ProjectListItemDto[]> {
  const where: Prisma.ProjectWhereInput = {
    tenantId,
    deletedAt: null,
    ...(filters.unassignedOnly
      ? { teamId: UNASSIGNED_TEAM_ID }
      : filters.teamId
        ? { teamId: filters.teamId }
        : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.excludeShipped
      ? { status: { notIn: ["shipped", "completed"] } }
      : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.search
      ? {
          OR: [
            { projectNumber: { contains: filters.search } },
            { projectName: { contains: filters.search } },
            { clientName: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [rows, processTypes] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { projectNumber: "asc" }],
      include: {
        productType: true,
        team: true,
        processRecords: { where: { recordType: "actual" } },
      },
    }),
    prisma.processType.findMany({
      where: { tenantId },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return rows.map((p) => buildListItem(p, processTypes));
}

export async function getProject(tenantId: string, id: string) {
  const p = await prisma.project.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      productType: true,
      team: true,
      processRecords: { where: { recordType: "actual" } },
    },
  });
  if (!p) return null;

  const processTypes = await prisma.processType.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
  });

  return buildListItem(p, processTypes);
}

export async function createProject(
  tenantId: string,
  data: {
    projectNumber: string;
    projectName: string;
    clientName?: string;
    productTypeId?: string;
    deadline?: string;
    weight?: number;
    memberLength?: number;
    drawingReceivedAt?: string;
    plannedHours?: number;
    weldingRatio?: number;
    teamId?: string;
    status?: string;
    category?: string;
    setCount?: number;
    detail?: string;
    pastAverageHours?: number;
    scheduleStartDate?: string;
    userId?: string;
  },
): Promise<Result<{ id: string }>> {
  const dup = await prisma.project.findFirst({
    where: { tenantId, projectNumber: data.projectNumber, deletedAt: null },
  });
  if (dup) {
    return { ok: false, error: "同じ工番が既に存在します", code: "VALIDATION_ERROR" };
  }

  const id = newId();
  const drawingReceivedAt = data.drawingReceivedAt
    ? parseDateOnly(data.drawingReceivedAt)
    : null;

  await prisma.project.create({
    data: {
      id,
      tenantId,
      projectNumber: data.projectNumber,
      projectName: data.projectName,
      clientName: data.clientName ?? null,
      productTypeId: data.productTypeId ?? null,
      deadline: data.deadline ? parseDateOnly(data.deadline) : null,
      weight: data.weight != null ? new Prisma.Decimal(data.weight) : null,
      memberLength:
        data.memberLength != null ? new Prisma.Decimal(data.memberLength) : null,
      drawingReceivedAt,
      plannedHours:
        data.plannedHours != null ? new Prisma.Decimal(data.plannedHours) : null,
      weldingRatio:
        data.weldingRatio != null ? new Prisma.Decimal(data.weldingRatio) : null,
      teamId: data.teamId ?? UNASSIGNED_TEAM_ID,
      status: data.status ?? (drawingReceivedAt ? "in_progress" : "drawing_wait"),
      category: data.category ?? null,
      setCount: data.setCount ?? null,
      detail: data.detail ?? null,
      pastAverageHours:
        data.pastAverageHours != null
          ? new Prisma.Decimal(data.pastAverageHours)
          : null,
    },
  });

  if (data.scheduleStartDate) {
    const { applyScheduleOnProjectCreate } = await import("./schedule-model.service.js");
    const applyResult = await applyScheduleOnProjectCreate(tenantId, id, {
      startDate: data.scheduleStartDate,
      weight: data.weight,
      memberLength: data.memberLength,
      userId: data.userId,
    });
    if (!applyResult.ok) {
      return applyResult;
    }
  }

  return { ok: true, data: { id } };
}

export async function updateProject(
  tenantId: string,
  id: string,
  data: Record<string, unknown>,
): Promise<Result<{ id: string }>> {
  const existing = await prisma.project.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "工事が見つかりません", code: "NOT_FOUND" };

  const updateData: Prisma.ProjectUpdateInput = {};
  if (typeof data.projectName === "string") updateData.projectName = data.projectName;
  if (typeof data.clientName === "string") updateData.clientName = data.clientName;
  if (typeof data.productTypeId === "string") {
    updateData.productType = { connect: { id: data.productTypeId } };
  }
  if (data.productTypeId === null) updateData.productType = { disconnect: true };
  if (typeof data.deadline === "string") {
    updateData.deadline = parseDateOnly(data.deadline);
  }
  if (typeof data.weight === "number") {
    updateData.weight = new Prisma.Decimal(data.weight);
  }
  if (typeof data.memberLength === "number") {
    updateData.memberLength = new Prisma.Decimal(data.memberLength);
  }
  if (typeof data.drawingReceivedAt === "string") {
    updateData.drawingReceivedAt = parseDateOnly(data.drawingReceivedAt);
    updateData.status = "in_progress";
  }
  if (typeof data.plannedHours === "number") {
    updateData.plannedHours = new Prisma.Decimal(data.plannedHours);
  }
  if (typeof data.weldingRatio === "number") {
    updateData.weldingRatio = new Prisma.Decimal(data.weldingRatio);
  }
  if (typeof data.teamId === "string") {
    updateData.team = { connect: { id: data.teamId } };
  }
  if (data.teamId === null) updateData.team = { disconnect: true };
  if (typeof data.status === "string") updateData.status = data.status;
  if (typeof data.category === "string") updateData.category = data.category;
  if (typeof data.setCount === "number") updateData.setCount = data.setCount;
  if (typeof data.detail === "string") updateData.detail = data.detail;
  if (typeof data.pastAverageHours === "number") {
    updateData.pastAverageHours = new Prisma.Decimal(data.pastAverageHours);
  }
  if (typeof data.scheduleStartDate === "string") {
    updateData.scheduleStartDate = parseDateOnly(data.scheduleStartDate);
  }

  await prisma.project.update({ where: { id }, data: updateData });
  return { ok: true, data: { id } };
}

export async function deleteProject(
  tenantId: string,
  id: string,
): Promise<Result<{ id: string }>> {
  const existing = await prisma.project.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "工事が見つかりません", code: "NOT_FOUND" };
  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  return { ok: true, data: { id } };
}

type ImportRow = {
  projectNumber: string;
  projectName: string;
  clientName?: string;
  deadline?: string;
  weight?: number;
  plannedHours?: number;
  teamId?: string;
  category?: string;
};

export async function importProjects(
  tenantId: string,
  rows: ImportRow[],
): Promise<Result<{ created: number; updated: number; errors: string[] }>> {
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.projectNumber || !row.projectName) {
      errors.push(`工番または工事名が空の行をスキップしました`);
      continue;
    }
    const existing = await prisma.project.findFirst({
      where: { tenantId, projectNumber: row.projectNumber, deletedAt: null },
    });
    if (existing) {
      await prisma.project.update({
        where: { id: existing.id },
        data: {
          projectName: row.projectName,
          clientName: row.clientName ?? existing.clientName,
          deadline: row.deadline ? parseDateOnly(row.deadline) : existing.deadline,
          weight:
            row.weight != null ? new Prisma.Decimal(row.weight) : existing.weight,
          plannedHours:
            row.plannedHours != null
              ? new Prisma.Decimal(row.plannedHours)
              : existing.plannedHours,
          teamId: row.teamId ?? existing.teamId,
          category: row.category ?? existing.category,
        },
      });
      updated++;
    } else {
      const result = await createProject(tenantId, row);
      if (result.ok) created++;
      else errors.push(`${row.projectNumber}: ${result.error}`);
    }
  }

  return { ok: true, data: { created, updated, errors } };
}

export function parseCsvImport(csv: string): ImportRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim());
  const idx = (name: string) => headers.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const num = (name: string) => {
      const v = cols[idx(name)];
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      projectNumber: cols[idx("projectNumber")] ?? cols[idx("工番")] ?? "",
      projectName: cols[idx("projectName")] ?? cols[idx("工事名")] ?? "",
      clientName: cols[idx("clientName")] ?? cols[idx("客先名")],
      deadline: cols[idx("deadline")] ?? cols[idx("納期")],
      weight: num("weight") ?? num("重量"),
      plannedHours: num("plannedHours") ?? num("予定時間"),
      category: cols[idx("category")] ?? cols[idx("カテゴリ")],
    };
  });
}
