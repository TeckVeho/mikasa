import type { ProcessRecordType, Result, TeamScheduleDto } from "@logivoice/shared";
import { UNASSIGNED_TEAM_ID, resolveProcessRatio, round1 } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import { toNumber } from "../utils/decimal.js";
import { parseDateOnly, formatDateOnly } from "../utils/date.js";
import { processRecordUniqueKey } from "../utils/process-record.js";
import { assertProjectAssignedToTeam } from "../utils/project-team.js";
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

function buildDailyHoursMap(
  records: { date: Date; hours: unknown }[],
): Record<string, number> {
  const dailyHours: Record<string, number> = {};
  for (const rec of records) {
    const dateStr = formatDateOnly(rec.date);
    dailyHours[dateStr] = toNumber(rec.hours as never) ?? 0;
  }
  return dailyHours;
}

export async function getTeamSchedule(
  tenantId: string,
  teamId: string,
  month: string,
  months = 1,
): Promise<TeamScheduleDto | null> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, tenantId, deletedAt: null },
  });
  if (!team) return null;

  const span = clampScheduleMonths(months);
  const { start, end, dates } = scheduleRange(month, span);

  const [projects, processTypes, calendarRows, records, historicalRatios] =
    await Promise.all([
    prisma.project.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ["shipped", "completed"] },
        projectTeams: { some: { teamId } },
      },
      orderBy: [{ sortOrder: "asc" }, { projectNumber: "asc" }],
    }),
    prisma.processType.findMany({
      where: { tenantId },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.calendar.findMany({
      where: { tenantId, date: { gte: start, lte: end } },
    }),
    prisma.processRecord.findMany({
      where: {
        date: { gte: start, lte: end },
        project: {
          tenantId,
          deletedAt: null,
          projectTeams: { some: { teamId } },
        },
        OR: [
          { teamId },
          { teamId: UNASSIGNED_TEAM_ID, recordType: "planned" },
        ],
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

  const scheduleProjects = projects.map((project) => {
    const plannedHours = toNumber(project.plannedHours) ?? 0;
    const projectRecords = records.filter((r) => r.projectId === project.id);

    const processes = processTypes.map((pt) => {
      const defaultRatio = toNumber(pt.defaultRatio) ?? 0;
      const ratio = resolveProcessRatio(pt.name, historicalRatios, defaultRatio);
      const targetHours = round1(plannedHours * ratio);
      const actualRecords = projectRecords.filter(
        (r) => r.processTypeId === pt.id && r.recordType === "actual",
      );
      const plannedRecords = projectRecords.filter(
        (r) => r.processTypeId === pt.id && r.recordType === "planned",
      );
      const actualHours = round2(
        actualRecords.reduce((s, r) => s + (toNumber(r.hours) ?? 0), 0),
      );
      const progressRate =
        targetHours > 0 ? round2((actualHours / targetHours) * 100) : 0;

      const actualDailyHours = buildDailyHoursMap(actualRecords);
      const plannedDailyHours = buildDailyHoursMap(plannedRecords);

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
      deadline: project.deadline ? formatDateOnly(project.deadline) : null,
      status: project.status as TeamScheduleDto["projects"][0]["status"],
      clientName: project.clientName,
      weight: toNumber(project.weight),
      setCount: project.setCount,
      detail: project.detail,
      plannedHours,
      pastAverageHours: toNumber(project.pastAverageHours),
      totalActualHours,
      totalProgressRate,
      processes,
    };
  });

  return {
    teamId: team.id,
    teamName: team.name,
    month,
    months: span,
    dates,
    holidays,
    projects: scheduleProjects,
  };
}

export async function moveScheduleRecord(
  _tenantId: string,
  teamId: string,
  userId: string,
  data: {
    projectId: string;
    processTypeId: string;
    fromDate: string;
    toDate: string;
    hours: number;
    recordType?: ProcessRecordType;
  },
): Promise<Result<{ moved: boolean }>> {
  const recordType = data.recordType ?? "actual";
  const assigned = await assertProjectAssignedToTeam(data.projectId, teamId);
  if (!assigned) {
    return { ok: false, error: "工事が見つかりません", code: "NOT_FOUND" };
  }

  const from = parseDateOnly(data.fromDate);
  const to = parseDateOnly(data.toDate);

  await prisma.$transaction(async (tx) => {
    await tx.processRecord.deleteMany({
      where: {
        projectId: data.projectId,
        processTypeId: data.processTypeId,
        teamId,
        date: from,
        recordType,
      },
    });

    const existing = await tx.processRecord.findUnique({
      where: processRecordUniqueKey(
        data.projectId,
        data.processTypeId,
        teamId,
        to,
        recordType,
      ),
    });

    const newHours = existing
      ? (toNumber(existing.hours) ?? 0) + data.hours
      : data.hours;

    await tx.processRecord.upsert({
      where: processRecordUniqueKey(
        data.projectId,
        data.processTypeId,
        teamId,
        to,
        recordType,
      ),
      create: {
        id: newId(),
        projectId: data.projectId,
        processTypeId: data.processTypeId,
        teamId,
        date: to,
        hours: newHours,
        recordType,
        recordedBy: userId,
      },
      update: {
        hours: newHours,
        recordedBy: userId,
      },
    });
  });

  return { ok: true, data: { moved: true } };
}

export async function upsertScheduleCell(
  _tenantId: string,
  teamId: string,
  userId: string,
  data: {
    projectId: string;
    processTypeId: string;
    date: string;
    hours: number;
    recordType?: ProcessRecordType;
  },
): Promise<Result<{ saved: boolean }>> {
  const recordType = data.recordType ?? "actual";
  const assigned = await assertProjectAssignedToTeam(data.projectId, teamId);
  if (!assigned) {
    return { ok: false, error: "工事が見つかりません", code: "NOT_FOUND" };
  }

  const date = parseDateOnly(data.date);

  if (data.hours <= 0) {
    await prisma.processRecord.deleteMany({
      where: {
        projectId: data.projectId,
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
      data.projectId,
      data.processTypeId,
      teamId,
      date,
      recordType,
    ),
    create: {
      id: newId(),
      projectId: data.projectId,
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
