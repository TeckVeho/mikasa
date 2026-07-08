import { Prisma } from "@prisma/client";
import type {
  Result,
  ScheduleApplyPreviewDto,
  ScheduleModelDto,
} from "@logivoice/shared";
import {
  buildProcessTargets,
  distributePlannedHoursByProcessPercent,
  isLegacyScheduleRatioFormat,
  normalizeSchedulePercent,
  sumSchedulePercents,
} from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import { toNumber } from "../utils/decimal.js";
import { parseDateOnly, formatDateOnly, addDays } from "../utils/date.js";
import {
  buildHolidaySet,
  estimateCalendarSpanForWorkingDays,
  getNthWorkingDay,
} from "../utils/working-days.js";
import { previewProjectModel, loadTenantProcessRatios } from "./model.service.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function loadHolidaySet(
  tenantId: string,
  startDate: Date,
  workingDaySpan: number,
): Promise<Set<string>> {
  const calendarEnd = addDays(
    startDate,
    estimateCalendarSpanForWorkingDays(workingDaySpan),
  );
  const rows = await prisma.calendar.findMany({
    where: {
      tenantId,
      date: { gte: startDate, lte: calendarEnd },
      isHoliday: true,
    },
    select: { date: true, isHoliday: true },
  });
  return buildHolidaySet(
    rows.map((row) => ({ date: row.date, isHoliday: row.isHoliday })),
  );
}

export async function getScheduleModel(
  tenantId: string,
): Promise<ScheduleModelDto | null> {
  const model = await prisma.scheduleModel.findUnique({
    where: { tenantId },
    include: {
      dayPatterns: {
        include: { processType: true },
        orderBy: [{ dayOffset: "asc" }, { processType: { displayOrder: "asc" } }],
      },
    },
  });
  if (!model) return null;

  let dayPatterns = model.dayPatterns.map((row) => ({
    processTypeId: row.processTypeId,
    processTypeName: row.processType.name,
    dayOffset: row.dayOffset,
    hoursRatio: toNumber(row.hoursRatio) ?? 0,
  }));

  if (isLegacyScheduleRatioFormat(dayPatterns)) {
    dayPatterns = dayPatterns.map((row) => ({
      ...row,
      hoursRatio: normalizeSchedulePercent(row.hoursRatio * 100),
    }));
  }

  const ratioSum = sumSchedulePercents(dayPatterns);

  return {
    id: model.id,
    totalDays: model.totalDays,
    dayPatterns,
    ratioSum,
  };
}

type UpsertScheduleModelInput = {
  totalDays: number;
  dayPatterns: {
    processTypeId: string;
    dayOffset: number;
    hoursRatio: number;
  }[];
};

export async function upsertScheduleModel(
  tenantId: string,
  input: UpsertScheduleModelInput,
): Promise<Result<ScheduleModelDto>> {
  if (!Number.isFinite(input.totalDays) || input.totalDays < 1) {
    return {
      ok: false,
      error: "工期日数は1以上を指定してください",
      code: "VALIDATION_ERROR",
    };
  }

  const processTypes = await prisma.processType.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const validProcessIds = new Set(processTypes.map((p) => p.id));

  for (const row of input.dayPatterns) {
    if (!validProcessIds.has(row.processTypeId)) {
      return {
        ok: false,
        error: "無効な工程が含まれています",
        code: "VALIDATION_ERROR",
      };
    }
    if (row.dayOffset < 0 || row.dayOffset >= input.totalDays) {
      return {
        ok: false,
        error: "日オフセットが工期の範囲外です",
        code: "VALIDATION_ERROR",
      };
    }
    if (!Number.isFinite(row.hoursRatio) || row.hoursRatio < 0) {
      return {
        ok: false,
        error: "工数割合は0以上の数値を指定してください",
        code: "VALIDATION_ERROR",
      };
    }
  }

  const modelId = newId();
  await prisma.$transaction(async (tx) => {
    const existing = await tx.scheduleModel.findUnique({ where: { tenantId } });
    const scheduleModelId = existing?.id ?? modelId;

    if (existing) {
      await tx.scheduleModelDay.deleteMany({
        where: { scheduleModelId: existing.id },
      });
      await tx.scheduleModel.update({
        where: { id: existing.id },
        data: { totalDays: input.totalDays },
      });
    } else {
      await tx.scheduleModel.create({
        data: {
          id: scheduleModelId,
          tenantId,
          totalDays: input.totalDays,
        },
      });
    }

    if (input.dayPatterns.length > 0) {
      await tx.scheduleModelDay.createMany({
        data: input.dayPatterns.map((row) => ({
          id: newId(),
          scheduleModelId,
          processTypeId: row.processTypeId,
          dayOffset: row.dayOffset,
          hoursRatio: new Prisma.Decimal(normalizeSchedulePercent(row.hoursRatio)),
        })),
      });
    }
  });

  const data = await getScheduleModel(tenantId);
  if (!data) {
    return { ok: false, error: "モデルの保存に失敗しました", code: "INTERNAL_ERROR" };
  }
  return { ok: true, data };
}

async function buildProcessTargetHoursById(
  tenantId: string,
  plannedHours: number,
): Promise<Map<string, number>> {
  const [processTypes, historicalRatios] = await Promise.all([
    prisma.processType.findMany({
      where: { tenantId },
      orderBy: { displayOrder: "asc" },
    }),
    loadTenantProcessRatios(tenantId),
  ]);

  const targets = buildProcessTargets(
    plannedHours,
    processTypes.map((pt) => ({
      name: pt.name,
      defaultRatio: toNumber(pt.defaultRatio) ?? 0,
    })),
    historicalRatios,
  );

  const map = new Map<string, number>();
  for (const pt of processTypes) {
    const target = targets.find((row) => row.processName === pt.name);
    if (target) {
      map.set(pt.id, target.targetHours);
    }
  }
  return map;
}

export function buildPlannedEntries(
  model: NonNullable<Awaited<ReturnType<typeof getScheduleModel>>>,
  startDate: Date,
  plannedHours: number,
  processTargetHoursById: Map<string, number>,
  holidaySet: Set<string>,
) {
  const dailySchedule: ScheduleApplyPreviewDto["dailySchedule"] = [];
  const totalsByProcess = new Map<string, { name: string; hours: number }>();

  for (const row of model.dayPatterns) {
    if (row.hoursRatio <= 0) continue;
    const processTarget = processTargetHoursById.get(row.processTypeId) ?? 0;
    const hours = distributePlannedHoursByProcessPercent(
      processTarget,
      row.hoursRatio,
    );
    if (hours <= 0) continue;
    const workingDay = getNthWorkingDay(startDate, row.dayOffset, holidaySet);
    if (!workingDay) continue;
    const date = formatDateOnly(workingDay);
    dailySchedule.push({
      date,
      processTypeId: row.processTypeId,
      processTypeName: row.processTypeName,
      hours,
    });
    const current = totalsByProcess.get(row.processTypeId) ?? {
      name: row.processTypeName,
      hours: 0,
    };
    current.hours = round2(current.hours + hours);
    totalsByProcess.set(row.processTypeId, current);
  }

  dailySchedule.sort((a, b) => a.date.localeCompare(b.date));

  const lastWorkingDay =
    model.totalDays > 0
      ? getNthWorkingDay(startDate, model.totalDays - 1, holidaySet)
      : startDate;
  const endDate = formatDateOnly(lastWorkingDay ?? startDate);

  return {
    startDate: formatDateOnly(startDate),
    endDate,
    totalDays: model.totalDays,
    plannedHours,
    dailySchedule,
    processTotals: [...totalsByProcess.entries()].map(([processTypeId, value]) => ({
      processTypeId,
      processTypeName: value.name,
      hours: value.hours,
    })),
  };
}

export async function previewScheduleApply(
  tenantId: string,
  plannedHours: number,
  startDateStr: string,
): Promise<Result<ScheduleApplyPreviewDto>> {
  if (!Number.isFinite(plannedHours) || plannedHours <= 0) {
    return {
      ok: false,
      error: "目標時間が未設定です",
      code: "VALIDATION_ERROR",
    };
  }

  const model = await getScheduleModel(tenantId);
  if (!model || model.dayPatterns.length === 0) {
    return {
      ok: false,
      error: "モデルマスタが未設定です。設定画面で登録してください",
      code: "MODEL_NOT_CONFIGURED",
    };
  }

  const startDate = parseDateOnly(startDateStr);
  const maxDayOffset = Math.max(
    model.totalDays - 1,
    ...model.dayPatterns.map((row) => row.dayOffset),
    0,
  );
  const [processTargetHoursById, holidaySet] = await Promise.all([
    buildProcessTargetHoursById(tenantId, plannedHours),
    loadHolidaySet(tenantId, startDate, maxDayOffset + 1),
  ]);
  return {
    ok: true,
    data: buildPlannedEntries(
      model,
      startDate,
      plannedHours,
      processTargetHoursById,
      holidaySet,
    ),
  };
}

export async function applyScheduleModelToProject(
  tenantId: string,
  projectId: string,
  startDateStr: string,
  userId?: string,
): Promise<Result<ScheduleApplyPreviewDto>> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    select: { id: true, plannedHours: true, pastAverageHours: true },
  });
  if (!project) {
    return { ok: false, error: "工事が見つかりません", code: "NOT_FOUND" };
  }

  const plannedHours =
    toNumber(project.plannedHours) ?? toNumber(project.pastAverageHours) ?? 0;
  const preview = await previewScheduleApply(tenantId, plannedHours, startDateStr);
  if (!preview.ok) return preview;

  const startDate = parseDateOnly(startDateStr);

  await prisma.$transaction(async (tx) => {
    await tx.processRecord.deleteMany({
      where: { projectId, recordType: "planned" },
    });

    for (const entry of preview.data.dailySchedule) {
      await tx.processRecord.create({
        data: {
          id: newId(),
          projectId,
          processTypeId: entry.processTypeId,
          date: parseDateOnly(entry.date),
          hours: new Prisma.Decimal(entry.hours),
          recordType: "planned",
          recordedBy: userId ?? null,
        },
      });
    }

    await tx.project.update({
      where: { id: projectId },
      data: { scheduleStartDate: startDate },
    });
  });

  return preview;
}

export async function applyScheduleOnProjectCreate(
  tenantId: string,
  projectId: string,
  options: {
    startDate: string;
    weight?: number;
    memberLength?: number;
    userId?: string;
  },
): Promise<Result<{ projectId: string }>> {
  if (
    options.weight != null &&
    options.memberLength != null &&
    options.weight > 0 &&
    options.memberLength > 0
  ) {
    const modelResult = await previewProjectModel(
      tenantId,
      projectId,
      options.weight,
      options.memberLength,
    );
    if (modelResult.ok) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          weight: new Prisma.Decimal(options.weight),
          memberLength: new Prisma.Decimal(options.memberLength),
          plannedHours: new Prisma.Decimal(modelResult.data.plannedHours),
          pastAverageHours: new Prisma.Decimal(modelResult.data.pastAverageHours),
          weldingRatio: new Prisma.Decimal(modelResult.data.weldingRatio),
        },
      });
    }
  }

  const applyResult = await applyScheduleModelToProject(
    tenantId,
    projectId,
    options.startDate,
    options.userId,
  );
  if (!applyResult.ok) return applyResult;

  return { ok: true, data: { projectId } };
}
