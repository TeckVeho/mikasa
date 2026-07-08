import { Prisma } from "@prisma/client";
import type {
  ModelRegressionSampleDto,
  ProcessRatiosMap,
  ProjectModelPreviewDto,
  Result,
} from "@logivoice/shared";
import {
  buildProcessTargets,
  buildRegressionPoints,
  calculatePastAverageHours,
  computeProcessRatiosFromTotals,
  fitLinearRegression,
  round1,
  weldingRatioFromTargets,
} from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/decimal.js";

const HISTORICAL_PROCESS_FIELDS = [
  { key: "assemblyPrepHours" as const, name: "組立前" },
  { key: "assemblyHours" as const, name: "組立" },
  { key: "weldingHours" as const, name: "溶接" },
  { key: "distortionHours" as const, name: "歪取り" },
  { key: "paintingHours" as const, name: "塗装" },
  { key: "finishingHours" as const, name: "仕上げ" },
];

type HistoricalRow = {
  id: string;
  projectNumber: string;
  bridgeName: string | null;
  weight: Prisma.Decimal | null;
  memberLength: Prisma.Decimal | null;
  totalHours: Prisma.Decimal | null;
  assemblyPrepHours: Prisma.Decimal | null;
  assemblyHours: Prisma.Decimal | null;
  weldingHours: Prisma.Decimal | null;
  distortionHours: Prisma.Decimal | null;
  paintingHours: Prisma.Decimal | null;
  finishingHours: Prisma.Decimal | null;
  productType: { name: string };
  team: { name: string };
};

function sumProcessHours(row: HistoricalRow): number {
  return HISTORICAL_PROCESS_FIELDS.reduce(
    (sum, field) => sum + (toNumber(row[field.key]) ?? 0),
    0,
  );
}

function resolveTotalHours(row: HistoricalRow): number | null {
  const total = toNumber(row.totalHours);
  if (total != null && total > 0) return total;
  const summed = sumProcessHours(row);
  return summed > 0 ? summed : null;
}

async function loadHistoricalRows(tenantId: string): Promise<HistoricalRow[]> {
  return prisma.historicalAverage.findMany({
    where: { tenantId },
    select: {
      id: true,
      projectNumber: true,
      bridgeName: true,
      weight: true,
      memberLength: true,
      totalHours: true,
      assemblyPrepHours: true,
      assemblyHours: true,
      weldingHours: true,
      distortionHours: true,
      paintingHours: true,
      finishingHours: true,
      productType: { select: { name: true } },
      team: { select: { name: true } },
    },
    orderBy: [
      { productType: { name: "asc" } },
      { team: { sortOrder: "asc" } },
      { projectNumber: "asc" },
    ],
  });
}

function buildRegressionFromRows(rows: HistoricalRow[]) {
  const regressionSamples: ModelRegressionSampleDto[] = [];

  for (const row of rows) {
    const weight = toNumber(row.weight);
    const memberLength = toNumber(row.memberLength);
    const totalHours = resolveTotalHours(row);
    if (
      weight == null ||
      memberLength == null ||
      totalHours == null ||
      weight <= 0 ||
      memberLength <= 0 ||
      totalHours <= 0
    ) {
      continue;
    }

    regressionSamples.push({
      id: row.id,
      productTypeName: row.productType.name,
      projectNumber: row.projectNumber,
      bridgeName: row.bridgeName,
      teamName: row.team.name,
      weight,
      memberLength,
      totalHours: round1(totalHours),
    });
  }

  const points = buildRegressionPoints(
    regressionSamples.map((sample) => ({
      weight: sample.weight,
      memberLength: sample.memberLength,
      totalHours: sample.totalHours,
    })),
  );
  const fit = fitLinearRegression(points);
  if (!fit) {
    return {
      ok: false as const,
      sampleCount: points.length,
      regressionSamples,
    };
  }

  return {
    ok: true as const,
    regressionA: fit.a,
    regressionB: fit.b,
    sampleCount: points.length,
    regressionSamples,
  };
}

function buildProcessRatiosFromRows(rows: HistoricalRow[]) {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    for (const field of HISTORICAL_PROCESS_FIELDS) {
      const hours = toNumber(row[field.key]) ?? 0;
      if (hours > 0) {
        totals[field.name] = (totals[field.name] ?? 0) + hours;
      }
    }
  }
  return computeProcessRatiosFromTotals(totals);
}

export async function previewProjectModel(
  tenantId: string,
  projectId: string,
  weight: number,
  memberLength: number,
): Promise<Result<ProjectModelPreviewDto>> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!project) {
    return { ok: false, error: "工事が見つかりません", code: "NOT_FOUND" };
  }

  const historicalRows = await loadHistoricalRows(tenantId);
  const regression = buildRegressionFromRows(historicalRows);
  if (!regression.ok) {
    return {
      ok: false,
      error:
        "過去実績が不足しています（重量・部材長さ・時間が揃った実績が2件以上必要です）",
      code: "INSUFFICIENT_HISTORICAL_DATA",
    };
  }

  const pastAverageHours = calculatePastAverageHours(
    weight,
    memberLength,
    regression.regressionA,
    regression.regressionB,
  );
  if (pastAverageHours == null) {
    return {
      ok: false,
      error: "重量と部材長さは正の数値を入力してください",
      code: "INVALID_INPUT",
    };
  }

  const processTypes = await prisma.processType.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
  });

  const processRatios = buildProcessRatiosFromRows(historicalRows);

  const processTargets = buildProcessTargets(
    pastAverageHours,
    processTypes.map((pt) => ({
      name: pt.name,
      defaultRatio: toNumber(pt.defaultRatio) ?? 0,
    })),
    processRatios,
  );

  const weldingRatio = weldingRatioFromTargets(processTargets);
  if (weldingRatio == null) {
    return {
      ok: false,
      error: "溶接工程の比率を算出できません",
      code: "MODEL_CONFIG_ERROR",
    };
  }

  return {
    ok: true,
    data: {
      weight,
      memberLength,
      pastAverageHours,
      plannedHours: pastAverageHours,
      weldingRatio,
      regressionA: regression.regressionA,
      regressionB: regression.regressionB,
      sampleCount: regression.sampleCount,
      regressionSamples: regression.regressionSamples,
      processTargets,
    },
  };
}

export async function applyProjectModel(
  tenantId: string,
  projectId: string,
  weight: number,
  memberLength: number,
): Promise<Result<ProjectModelPreviewDto>> {
  const preview = await previewProjectModel(tenantId, projectId, weight, memberLength);
  if (!preview.ok) return preview;

  await prisma.project.update({
    where: { id: projectId },
    data: {
      weight: new Prisma.Decimal(weight),
      memberLength: new Prisma.Decimal(memberLength),
      plannedHours: new Prisma.Decimal(preview.data.plannedHours),
      pastAverageHours: new Prisma.Decimal(preview.data.pastAverageHours),
      weldingRatio: new Prisma.Decimal(preview.data.weldingRatio),
    },
  });

  return preview;
}

export async function loadTenantProcessRatios(
  tenantId: string,
): Promise<ProcessRatiosMap | null> {
  const historicalRows = await loadHistoricalRows(tenantId);
  return buildProcessRatiosFromRows(historicalRows);
}
