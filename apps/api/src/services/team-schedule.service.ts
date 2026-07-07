import type { Result, TeamScheduleDto } from "@logivoice/shared";
import { resolveProcessRatio } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import { toNumber } from "../utils/decimal.js";
import { parseDateOnly, formatDateOnly } from "../utils/date.js";
import { loadProductRatiosByProjectIds } from "./model.service.js";

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

  const [projects, processTypes, calendarRows, records] = await Promise.all([
    prisma.project.findMany({
      where: {
        tenantId,
        teamId,
        deletedAt: null,
        status: { notIn: ["shipped", "completed"] },
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
        project: { tenantId, teamId, deletedAt: null },
      },
    }),
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

  const productRatiosMap = await loadProductRatiosByProjectIds(
    tenantId,
    projects.map((p) => p.productTypeId).filter((id): id is string => !!id),
  );

  const scheduleProjects = projects.map((project) => {
    const plannedHours = toNumber(project.plannedHours) ?? 0;
    const projectRecords = records.filter((r) => r.projectId === project.id);
    const productRatios = project.productTypeId
      ? productRatiosMap.get(project.productTypeId) ?? null
      : null;

    const processes = processTypes.map((pt) => {
      const defaultRatio = toNumber(pt.defaultRatio) ?? 0;
      const ratio = resolveProcessRatio(pt.name, productRatios, defaultRatio);
      const targetHours = round2(plannedHours * ratio);
      const ptRecords = projectRecords.filter((r) => r.processTypeId === pt.id);
      const actualHours = round2(
        ptRecords.reduce((s, r) => s + (toNumber(r.hours) ?? 0), 0),
      );
      const progressRate =
        targetHours > 0 ? round2((actualHours / targetHours) * 100) : 0;

      const dailyHours: Record<string, number> = {};
      for (const rec of ptRecords) {
        const dateStr = formatDateOnly(rec.date);
        dailyHours[dateStr] = toNumber(rec.hours) ?? 0;
      }

      return {
        processTypeId: pt.id,
        processTypeName: pt.name,
        targetHours,
        actualHours,
        progressRate,
        dailyHours,
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
  tenantId: string,
  teamId: string,
  userId: string,
  data: {
    projectId: string;
    processTypeId: string;
    fromDate: string;
    toDate: string;
    hours: number;
  },
): Promise<Result<{ moved: boolean }>> {
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, tenantId, teamId, deletedAt: null },
  });
  if (!project) {
    return { ok: false, error: "工事が見つかりません", code: "NOT_FOUND" };
  }

  const from = parseDateOnly(data.fromDate);
  const to = parseDateOnly(data.toDate);

  await prisma.$transaction(async (tx) => {
    await tx.processRecord.deleteMany({
      where: {
        projectId: data.projectId,
        processTypeId: data.processTypeId,
        date: from,
      },
    });

    const existing = await tx.processRecord.findUnique({
      where: {
        projectId_processTypeId_date: {
          projectId: data.projectId,
          processTypeId: data.processTypeId,
          date: to,
        },
      },
    });

    const newHours = existing
      ? (toNumber(existing.hours) ?? 0) + data.hours
      : data.hours;

    await tx.processRecord.upsert({
      where: {
        projectId_processTypeId_date: {
          projectId: data.projectId,
          processTypeId: data.processTypeId,
          date: to,
        },
      },
      create: {
        id: newId(),
        projectId: data.projectId,
        processTypeId: data.processTypeId,
        date: to,
        hours: newHours,
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
  tenantId: string,
  teamId: string,
  userId: string,
  data: {
    projectId: string;
    processTypeId: string;
    date: string;
    hours: number;
  },
): Promise<Result<{ saved: boolean }>> {
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, tenantId, teamId, deletedAt: null },
  });
  if (!project) {
    return { ok: false, error: "工事が見つかりません", code: "NOT_FOUND" };
  }

  const date = parseDateOnly(data.date);

  if (data.hours <= 0) {
    await prisma.processRecord.deleteMany({
      where: {
        projectId: data.projectId,
        processTypeId: data.processTypeId,
        date,
      },
    });
    return { ok: true, data: { saved: true } };
  }

  await prisma.processRecord.upsert({
    where: {
      projectId_processTypeId_date: {
        projectId: data.projectId,
        processTypeId: data.processTypeId,
        date,
      },
    },
    create: {
      id: newId(),
      projectId: data.projectId,
      processTypeId: data.processTypeId,
      date,
      hours: data.hours,
      recordedBy: userId,
    },
    update: {
      hours: data.hours,
      recordedBy: userId,
    },
  });

  return { ok: true, data: { saved: true } };
}
