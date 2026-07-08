import type { ProcessRecordType, ProjectScheduleDto, Result } from "@logivoice/shared";
import { UNASSIGNED_TEAM_ID, resolveProcessRatio, round1 } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import { toNumber } from "../utils/decimal.js";
import { parseDateOnly, formatDateOnly } from "../utils/date.js";
import { processRecordUniqueKey } from "../utils/process-record.js";
import { loadTenantProcessRatios } from "./model.service.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clampScheduleMonths(months: number): number {
  if (!Number.isFinite(months)) return 1;
  return Math.min(3, Math.max(1, Math.round(months)));
}

function scheduleRange(
  month: string,
  months: number,
): { start: Date; end: Date; dates: string[] } {
  const span = clampScheduleMonths(months);
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1));
  const endMonth = new Date(Date.UTC(y!, m! - 1 + span, 0));
  const dates: string[] = [];
  let cur = new Date(start);
  while (cur <= endMonth) {
    dates.push(formatDateOnly(cur));
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 1));
  }
  return { start, end: endMonth, dates };
}

function buildPlannedDailyHoursMap(
  records: {
    date: Date;
    hours: Parameters<typeof toNumber>[0];
    processTypeId: string;
    teamId: string;
    recordType: string;
  }[],
  processTypeId: string,
): Record<string, number> {
  const fallback: Record<string, number> = {};
  const unassigned: Record<string, number> = {};
  for (const rec of records) {
    if (rec.recordType !== "planned" || rec.processTypeId !== processTypeId) continue;
    const dateStr = formatDateOnly(rec.date);
    const hours = toNumber(rec.hours) ?? 0;
    if (rec.teamId === UNASSIGNED_TEAM_ID) {
      unassigned[dateStr] = hours;
    } else if (fallback[dateStr] == null) {
      fallback[dateStr] = hours;
    }
  }
  return { ...fallback, ...unassigned };
}

function buildAggregatedActualDailyHours(
  records: { date: Date; hours: Parameters<typeof toNumber>[0]; processTypeId: string }[],
  processTypeId: string,
): Record<string, number> {
  const dailyHours: Record<string, number> = {};
  for (const rec of records) {
    if (rec.processTypeId !== processTypeId) continue;
    const dateStr = formatDateOnly(rec.date);
    dailyHours[dateStr] = round2((dailyHours[dateStr] ?? 0) + (toNumber(rec.hours) ?? 0));
  }
  return dailyHours;
}

export async function getProjectSchedule(
  tenantId: string,
  projectId: string,
  month: string,
  months = 1,
): Promise<ProjectScheduleDto | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    include: {
      projectTeams: { include: { team: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!project) return null;

  const span = clampScheduleMonths(months);
  const { start, end, dates } = scheduleRange(month, span);

  const [processTypes, calendarRows, records, historicalRatios] = await Promise.all([
    prisma.processType.findMany({
      where: { tenantId },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.calendar.findMany({
      where: { tenantId, date: { gte: start, lte: end } },
    }),
    prisma.processRecord.findMany({
      where: {
        projectId,
        date: { gte: start, lte: end },
      },
    }),
    loadTenantProcessRatios(tenantId),
  ]);

  const holidays: Record<string, boolean> = {};
  for (const d of dates) {
    const dow = new Date(d + "T00:00:00Z").getUTCDay();
    holidays[d] = dow === 0 || dow === 6;
  }
  for (const row of calendarRows) {
    if (row.isHoliday) {
      holidays[formatDateOnly(row.date)] = true;
    }
  }

  const plannedHours = toNumber(project.plannedHours) ?? 0;
  const actualRecords = records.filter((r) => r.recordType === "actual");
  const plannedRecords = records.filter((r) => r.recordType === "planned");

  const processes = processTypes.map((pt) => {
    const defaultRatio = toNumber(pt.defaultRatio) ?? 0;
    const ratio = resolveProcessRatio(pt.name, historicalRatios, defaultRatio);
    const targetHours = round1(plannedHours * ratio);
    const processActualRecords = actualRecords.filter((r) => r.processTypeId === pt.id);
    const actualHours = round2(
      processActualRecords.reduce((s, r) => s + (toNumber(r.hours) ?? 0), 0),
    );
    const progressRate =
      targetHours > 0 ? round2((actualHours / targetHours) * 100) : 0;
    const actualDailyHours = buildAggregatedActualDailyHours(
      processActualRecords,
      pt.id,
    );
    const plannedDailyHours = buildPlannedDailyHoursMap(plannedRecords, pt.id);

    return {
      processTypeId: pt.id,
      processTypeName: pt.name,
      targetHours,
      actualHours,
      progressRate,
      dailyHours: actualDailyHours,
      plannedDailyHours,
      actualDailyHours,
    };
  });

  const totalActualHours = round2(
    processes.reduce((s, p) => s + p.actualHours, 0),
  );
  const totalProgressRate =
    plannedHours > 0 ? round2((totalActualHours / plannedHours) * 100) : 0;

  return {
    projectId: project.id,
    projectNumber: project.projectNumber,
    projectName: project.projectName,
    month,
    months: span,
    dates,
    holidays,
    teams: project.projectTeams.map((pt) => ({
      teamId: pt.teamId,
      teamName: pt.team.name,
    })),
    project: {
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      deadline: project.deadline ? formatDateOnly(project.deadline) : null,
      status: project.status as ProjectScheduleDto["project"]["status"],
      clientName: project.clientName,
      weight: toNumber(project.weight),
      setCount: project.setCount,
      detail: project.detail,
      plannedHours,
      pastAverageHours: toNumber(project.pastAverageHours),
      totalActualHours,
      totalProgressRate,
      processes,
    },
  };
}

export async function upsertProjectScheduleCell(
  tenantId: string,
  projectId: string,
  userId: string,
  data: {
    processTypeId: string;
    date: string;
    hours: number;
    recordType?: ProcessRecordType;
  },
): Promise<Result<{ saved: boolean }>> {
  const recordType = data.recordType ?? "planned";
  if (recordType !== "planned") {
    return {
      ok: false,
      error: "工事詳細では予定のみ編集できます。実績は班シートで入力してください",
      code: "VALIDATION_ERROR",
    };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
  });
  if (!project) {
    return { ok: false, error: "工事が見つかりません", code: "NOT_FOUND" };
  }

  const date = parseDateOnly(data.date);
  const teamId = UNASSIGNED_TEAM_ID;

  if (data.hours <= 0) {
    await prisma.processRecord.deleteMany({
      where: {
        projectId,
        processTypeId: data.processTypeId,
        teamId,
        date,
        recordType,
      },
    });
    return { ok: true, data: { saved: true } };
  }

  await prisma.processRecord.upsert({
    where: processRecordUniqueKey(
      projectId,
      data.processTypeId,
      teamId,
      date,
      recordType,
    ),
    create: {
      id: newId(),
      projectId,
      processTypeId: data.processTypeId,
      teamId,
      date,
      hours: data.hours,
      recordType,
      recordedBy: userId,
    },
    update: {
      hours: data.hours,
      recordedBy: userId,
    },
  });

  return { ok: true, data: { saved: true } };
}
