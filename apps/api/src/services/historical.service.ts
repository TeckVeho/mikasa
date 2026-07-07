import { Prisma } from "@prisma/client";
import type { Result, AlertDto } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import { toNumber } from "../utils/decimal.js";
import { getLoadChart } from "./load-chart.service.js";
import { getProjectProgress } from "./progress.service.js";
import { defaultDateRange } from "../utils/date.js";

const PROCESS_FIELDS = [
  { key: "assemblyPrepHours" as const, name: "組立前" },
  { key: "assemblyHours" as const, name: "組立" },
  { key: "weldingHours" as const, name: "溶接" },
  { key: "distortionHours" as const, name: "歪取り" },
  { key: "paintingHours" as const, name: "塗装" },
  { key: "finishingHours" as const, name: "仕上げ" },
];

type HistoricalAverageRow = {
  id: string;
  tenantId: string;
  productTypeId: string;
  projectNumber: string;
  clientName: string | null;
  bridgeName: string | null;
  completedAt: Date | null;
  teamId: string;
  manufacturingPlanned: Prisma.Decimal | null;
  salesPlanned: Prisma.Decimal | null;
  weight: Prisma.Decimal | null;
  assemblyPrepHours: Prisma.Decimal | null;
  assemblyHours: Prisma.Decimal | null;
  weldingHours: Prisma.Decimal | null;
  distortionHours: Prisma.Decimal | null;
  paintingHours: Prisma.Decimal | null;
  finishingHours: Prisma.Decimal | null;
  totalHours: Prisma.Decimal | null;
  projectCount: number | null;
  memberLength: Prisma.Decimal | null;
  weightPerMeter: Prisma.Decimal | null;
  productType: { name: string };
  team: { name: string };
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sumProcessHours(row: HistoricalAverageRow): number {
  return PROCESS_FIELDS.reduce((sum, f) => sum + (toNumber(row[f.key]) ?? 0), 0);
}

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function toDto(row: HistoricalAverageRow) {
  const actualHours = sumProcessHours(row);
  const manufacturingPlanned = toNumber(row.manufacturingPlanned);
  const salesPlanned = toNumber(row.salesPlanned);

  return {
    id: row.id,
    productTypeId: row.productTypeId,
    productTypeName: row.productType.name,
    projectNumber: row.projectNumber,
    clientName: row.clientName,
    bridgeName: row.bridgeName,
    completedAt: formatDate(row.completedAt),
    teamId: row.teamId,
    teamName: row.team.name,
    manufacturingPlanned,
    salesPlanned,
    weight: toNumber(row.weight),
    assemblyPrepHours: toNumber(row.assemblyPrepHours),
    assemblyHours: toNumber(row.assemblyHours),
    weldingHours: toNumber(row.weldingHours),
    distortionHours: toNumber(row.distortionHours),
    paintingHours: toNumber(row.paintingHours),
    finishingHours: toNumber(row.finishingHours),
    totalHours: toNumber(row.totalHours),
    projectCount: row.projectCount,
    memberLength: toNumber(row.memberLength),
    weightPerMeter: toNumber(row.weightPerMeter),
    actualHours: round1(actualHours),
    manufacturingRatio:
      manufacturingPlanned && manufacturingPlanned > 0
        ? round1((actualHours / manufacturingPlanned) * 100)
        : null,
    salesRatio:
      salesPlanned && salesPlanned > 0
        ? round1((actualHours / salesPlanned) * 100)
        : null,
    processBreakdown: PROCESS_FIELDS.map((f) => {
      const hours = toNumber(row[f.key]) ?? 0;
      return {
        name: f.name,
        hours,
        sharePercent: actualHours > 0 ? round1((hours / actualHours) * 100) : 0,
      };
    }),
  };
}

function avg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return round1(nums.reduce((s, v) => s + v, 0) / nums.length);
}

function buildSummary(records: ReturnType<typeof toDto>[]) {
  const actualHoursList = records.map((r) => r.actualHours);
  return {
    recordCount: records.length,
    manufacturingPlanned: avg(records.map((r) => r.manufacturingPlanned)),
    salesPlanned: avg(records.map((r) => r.salesPlanned)),
    weight: avg(records.map((r) => r.weight)),
    assemblyPrepHours: avg(records.map((r) => r.assemblyPrepHours)),
    assemblyHours: avg(records.map((r) => r.assemblyHours)),
    weldingHours: avg(records.map((r) => r.weldingHours)),
    distortionHours: avg(records.map((r) => r.distortionHours)),
    paintingHours: avg(records.map((r) => r.paintingHours)),
    finishingHours: avg(records.map((r) => r.finishingHours)),
    totalHours: avg(records.map((r) => r.totalHours)),
    actualHours: avg(actualHoursList),
  };
}

export async function listHistoricalAverages(
  tenantId: string,
  productTypeId: string,
) {
  const [teams, rows] = await Promise.all([
    prisma.team.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.historicalAverage.findMany({
      where: { tenantId, productTypeId },
      include: { productType: true, team: true },
      orderBy: [{ team: { sortOrder: "asc" } }, { projectNumber: "asc" }],
    }),
  ]);

  const dtos = rows.map((r) => toDto(r));
  const byTeam = new Map<string, ReturnType<typeof toDto>[]>();
  for (const dto of dtos) {
    const list = byTeam.get(dto.teamId) ?? [];
    list.push(dto);
    byTeam.set(dto.teamId, list);
  }

  return teams.map((team) => {
    const records = byTeam.get(team.id) ?? [];
    return {
      teamId: team.id,
      teamName: team.name,
      sortOrder: team.sortOrder,
      records,
      summary: buildSummary(records),
    };
  });
}

export async function listAllHistoricalRecords(tenantId: string) {
  const rows = await prisma.historicalAverage.findMany({
    where: { tenantId },
    include: { productType: true, team: true },
    orderBy: [
      { productType: { name: "asc" } },
      { team: { sortOrder: "asc" } },
      { projectNumber: "asc" },
    ],
  });
  return rows.map((r) => toDto(r));
}

export type HistoricalAverageInput = {
  productTypeId: string;
  projectNumber: string;
  clientName?: string | null;
  bridgeName?: string | null;
  completedAt?: string | null;
  teamId: string;
  manufacturingPlanned?: number | null;
  salesPlanned?: number | null;
  weight?: number | null;
  assemblyPrepHours?: number | null;
  assemblyHours?: number | null;
  weldingHours?: number | null;
  distortionHours?: number | null;
  paintingHours?: number | null;
  finishingHours?: number | null;
  totalHours?: number | null;
  projectCount?: number | null;
  memberLength?: number | null;
  weightPerMeter?: number | null;
};

function decimalOrNull(value: number | null | undefined) {
  if (value == null) return null;
  return new Prisma.Decimal(value);
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildDataPayload(data: Omit<HistoricalAverageInput, "productTypeId" | "projectNumber">) {
  return {
    clientName: data.clientName ?? null,
    bridgeName: data.bridgeName ?? null,
    completedAt: parseDateOnly(data.completedAt),
    teamId: data.teamId,
    manufacturingPlanned: decimalOrNull(data.manufacturingPlanned),
    salesPlanned: decimalOrNull(data.salesPlanned),
    weight: decimalOrNull(data.weight),
    assemblyPrepHours: decimalOrNull(data.assemblyPrepHours),
    assemblyHours: decimalOrNull(data.assemblyHours),
    weldingHours: decimalOrNull(data.weldingHours),
    distortionHours: decimalOrNull(data.distortionHours),
    paintingHours: decimalOrNull(data.paintingHours),
    finishingHours: decimalOrNull(data.finishingHours),
    totalHours: decimalOrNull(data.totalHours),
    projectCount: data.projectCount ?? null,
    memberLength: decimalOrNull(data.memberLength),
    weightPerMeter: decimalOrNull(data.weightPerMeter),
  };
}

export async function createHistoricalAverage(
  tenantId: string,
  data: HistoricalAverageInput,
): Promise<Result<{ id: string }>> {
  if (!data.projectNumber.trim()) {
    return { ok: false, error: "工番は必須です", code: "VALIDATION_ERROR" };
  }
  if (!data.teamId) {
    return { ok: false, error: "製作班は必須です", code: "VALIDATION_ERROR" };
  }

  const existing = await prisma.historicalAverage.findUnique({
    where: {
      tenantId_productTypeId_projectNumber: {
        tenantId,
        productTypeId: data.productTypeId,
        projectNumber: data.projectNumber.trim(),
      },
    },
  });
  if (existing) {
    return { ok: false, error: "同じ工番の過去実績が既に存在します", code: "CONFLICT" };
  }

  const row = await prisma.historicalAverage.create({
    data: {
      id: newId(),
      tenantId,
      productTypeId: data.productTypeId,
      projectNumber: data.projectNumber.trim(),
      ...buildDataPayload(data),
    },
  });

  return { ok: true, data: { id: row.id } };
}

export async function updateHistoricalAverage(
  tenantId: string,
  id: string,
  data: Partial<HistoricalAverageInput>,
): Promise<Result<{ id: string }>> {
  const existing = await prisma.historicalAverage.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return { ok: false, error: "過去実績が見つかりません", code: "NOT_FOUND" };
  }

  if (data.projectNumber && data.projectNumber !== existing.projectNumber) {
    const dup = await prisma.historicalAverage.findUnique({
      where: {
        tenantId_productTypeId_projectNumber: {
          tenantId,
          productTypeId: existing.productTypeId,
          projectNumber: data.projectNumber.trim(),
        },
      },
    });
    if (dup) {
      return { ok: false, error: "同じ工番の過去実績が既に存在します", code: "CONFLICT" };
    }
  }

  await prisma.historicalAverage.update({
    where: { id },
    data: {
      ...(data.projectNumber !== undefined
        ? { projectNumber: data.projectNumber.trim() }
        : {}),
      ...(data.clientName !== undefined ? { clientName: data.clientName } : {}),
      ...(data.bridgeName !== undefined ? { bridgeName: data.bridgeName } : {}),
      ...(data.completedAt !== undefined
        ? { completedAt: parseDateOnly(data.completedAt) }
        : {}),
      ...(data.teamId !== undefined ? { teamId: data.teamId } : {}),
      ...(data.manufacturingPlanned !== undefined
        ? { manufacturingPlanned: decimalOrNull(data.manufacturingPlanned) }
        : {}),
      ...(data.salesPlanned !== undefined
        ? { salesPlanned: decimalOrNull(data.salesPlanned) }
        : {}),
      ...(data.weight !== undefined ? { weight: decimalOrNull(data.weight) } : {}),
      ...(data.assemblyPrepHours !== undefined
        ? { assemblyPrepHours: decimalOrNull(data.assemblyPrepHours) }
        : {}),
      ...(data.assemblyHours !== undefined
        ? { assemblyHours: decimalOrNull(data.assemblyHours) }
        : {}),
      ...(data.weldingHours !== undefined
        ? { weldingHours: decimalOrNull(data.weldingHours) }
        : {}),
      ...(data.distortionHours !== undefined
        ? { distortionHours: decimalOrNull(data.distortionHours) }
        : {}),
      ...(data.paintingHours !== undefined
        ? { paintingHours: decimalOrNull(data.paintingHours) }
        : {}),
      ...(data.finishingHours !== undefined
        ? { finishingHours: decimalOrNull(data.finishingHours) }
        : {}),
      ...(data.totalHours !== undefined
        ? { totalHours: decimalOrNull(data.totalHours) }
        : {}),
      ...(data.projectCount !== undefined ? { projectCount: data.projectCount } : {}),
      ...(data.memberLength !== undefined
        ? { memberLength: decimalOrNull(data.memberLength) }
        : {}),
      ...(data.weightPerMeter !== undefined
        ? { weightPerMeter: decimalOrNull(data.weightPerMeter) }
        : {}),
    },
  });

  return { ok: true, data: { id } };
}

export async function deleteHistoricalAverage(
  tenantId: string,
  id: string,
): Promise<Result<{ id: string }>> {
  const existing = await prisma.historicalAverage.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return { ok: false, error: "過去実績が見つかりません", code: "NOT_FOUND" };
  }

  await prisma.historicalAverage.delete({ where: { id } });
  return { ok: true, data: { id } };
}

export async function lookupHistoricalAverage(
  tenantId: string,
  productTypeId: string,
  teamId: string,
): Promise<Result<{ totalHours: number; manufacturingPlanned: number | null; salesPlanned: number | null }>> {
  if (!teamId) {
    return {
      ok: false,
      error: "製作班が未割当のため過去平均を参照できません",
      code: "TEAM_UNASSIGNED",
    };
  }

  const rows = await prisma.historicalAverage.findMany({
    where: { tenantId, productTypeId, teamId },
  });

  if (rows.length === 0) {
    return {
      ok: false,
      error: "該当する品種×班の過去実績が登録されていません",
      code: "NOT_FOUND",
    };
  }

  const totalHours = avg(rows.map((r) => toNumber(r.totalHours)));
  if (totalHours == null || totalHours <= 0) {
    return {
      ok: false,
      error: "過去平均の工事時間が未設定です",
      code: "NOT_CONFIGURED",
    };
  }

  return {
    ok: true,
    data: {
      totalHours,
      manufacturingPlanned: avg(rows.map((r) => toNumber(r.manufacturingPlanned))),
      salesPlanned: avg(rows.map((r) => toNumber(r.salesPlanned))),
    },
  };
}

export async function getAlerts(tenantId: string): Promise<AlertDto[]> {
  const alerts: AlertDto[] = [];
  const now = new Date();

  const activeProjects = await prisma.project.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { in: ["in_progress", "drawing_wait", "shipping_wait"] },
    },
  });

  for (const p of activeProjects) {
    if (!p.deadline) continue;
    const progress = await getProjectProgress(tenantId, p.id);
    if (!progress) continue;

    const daysToDeadline = Math.ceil(
      (p.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (
      progress.forecastVariance != null &&
      progress.forecastVariance < 0 &&
      daysToDeadline < 30
    ) {
      alerts.push({
        type: "deadline_risk",
        projectId: p.id,
        projectNumber: p.projectNumber,
        message: `工番 ${p.projectNumber} は納期超過リスクがあります（予想差異: ${progress.forecastVariance}h）`,
        severity: daysToDeadline < 14 ? "critical" : "warning",
      });
    }
  }

  const range = defaultDateRange(1);
  const chart = await getLoadChart(tenantId, range.start, range.end, "category");
  const paceLine = chart.paceLines[0]?.value ?? 8;

  for (let i = 0; i < chart.dates.length; i++) {
    const total = chart.series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0);
    if (total > paceLine * 1.1) {
      alerts.push({
        type: "capacity_exceeded",
        message: `${chart.dates[i]} の負荷が定時間を超過しています（${Math.round(total * 10) / 10}h / ${paceLine}h）`,
        severity: total > paceLine * 1.3 ? "critical" : "warning",
      });
    }
  }

  return alerts.slice(0, 50);
}
