import type { Decimal } from "@prisma/client/runtime/library";
import type { LoadChartDto, LoadChartSeriesDto, LoadChartView } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/decimal.js";
import { parseDateOnly, formatDateOnly, eachDateInclusive } from "../utils/date.js";
import { listCapacitySettings } from "./master.service.js";

const OTHER_PROCESS_NAME = "その他";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function normalizeLoadChartView(view: string): LoadChartView {
  if (view === "total") return "category";
  if (view === "process" || view === "team") return view;
  return "category";
}

async function getPaceLines(tenantId: string, teamId?: string) {
  const capacitySettings = await listCapacitySettings(tenantId);
  const cap =
    (teamId
      ? capacitySettings.find((c) => c.teamId === teamId)
      : null) ??
    capacitySettings.find((c) => c.category === "all" && !c.teamId);

  if (!cap) {
    return [
      { label: "定時間", value: 8 },
      { label: "2H残業", value: 10 },
      { label: "4H残業", value: 12 },
    ];
  }

  return [
    { label: "定時間", value: cap.regularHoursPerDay * cap.headcount },
    { label: "2H残業", value: cap.overtime2hPerDay * cap.headcount },
    { label: "4H残業", value: cap.overtime4hPerDay * cap.headcount },
  ];
}

type ProcessRecordRow = {
  date: Date;
  hours: Decimal | number | null;
  processType: { id: string; name: string; isWelding: boolean };
};

export function buildCategorySeries(
  dates: string[],
  dateIndex: Map<string, number>,
  records: ProcessRecordRow[],
): LoadChartSeriesDto[] {
  const forging = new Array<number>(dates.length).fill(0);
  const welding = new Array<number>(dates.length).fill(0);
  const other = new Array<number>(dates.length).fill(0);

  for (const rec of records) {
    const idx = dateIndex.get(formatDateOnly(rec.date));
    if (idx == null) continue;
    const hours = toNumber(rec.hours) ?? 0;
    if (rec.processType.name === OTHER_PROCESS_NAME) {
      other[idx]! += hours;
    } else if (rec.processType.isWelding) {
      welding[idx]! += hours;
    } else {
      forging[idx]! += hours;
    }
  }

  return [
    { key: "forging", label: "鍛冶作業", values: forging.map(round2) },
    { key: "welding", label: "溶接作業", values: welding.map(round2) },
    { key: "other", label: "その他", values: other.map(round2) },
  ];
}

export async function getLoadChart(
  tenantId: string,
  start: string,
  end: string,
  view: LoadChartView = "category",
  filters: { teamId?: string } = {},
): Promise<LoadChartDto> {
  const chartView = normalizeLoadChartView(view);
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);

  if (chartView === "team") {
    return getTeamDailyChart(tenantId, startDate, endDate, filters.teamId);
  }

  const dates = eachDateInclusive(startDate, endDate).map(formatDateOnly);
  const dateIndex = new Map(dates.map((d, i) => [d, i]));

  const records = await prisma.processRecord.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      recordType: "actual",
      project: {
        tenantId,
        deletedAt: null,
        status: { notIn: ["shipped", "completed"] },
        ...(filters.teamId
          ? { projectTeams: { some: { teamId: filters.teamId } } }
          : {}),
      },
    },
    include: {
      processType: true,
    },
  });

  const paceLines = await getPaceLines(tenantId, filters.teamId);

  if (chartView === "process") {
    const processTypes = await prisma.processType.findMany({
      where: { tenantId },
      orderBy: { displayOrder: "asc" },
    });

    const series = processTypes.map((pt) => {
      const values = new Array<number>(dates.length).fill(0);
      for (const rec of records) {
        if (rec.processTypeId !== pt.id) continue;
        const idx = dateIndex.get(formatDateOnly(rec.date));
        if (idx == null) continue;
        values[idx]! += toNumber(rec.hours) ?? 0;
      }
      return {
        key: pt.id,
        label: pt.name,
        values: values.map(round2),
      };
    });

    return { dates, view: chartView, series, paceLines };
  }

  return {
    dates,
    view: "category",
    series: buildCategorySeries(dates, dateIndex, records),
    paceLines,
  };
}

async function getTeamDailyChart(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  filterTeamId?: string,
): Promise<LoadChartDto> {
  const teams = await prisma.team.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filterTeamId ? { id: filterTeamId } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });

  const dates = eachDateInclusive(startDate, endDate).map(formatDateOnly);
  const dateIndex = new Map(dates.map((d, i) => [d, i]));

  const records = await prisma.processRecord.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
      recordType: "actual",
      project: {
        tenantId,
        deletedAt: null,
        status: { notIn: ["shipped", "completed"] },
        ...(filterTeamId
          ? { projectTeams: { some: { teamId: filterTeamId } } }
          : {}),
      },
    },
    select: {
      date: true,
      hours: true,
      teamId: true,
    },
  });

  const series = teams.map((team) => {
    const values = new Array<number>(dates.length).fill(0);
    for (const rec of records) {
      if (rec.teamId !== team.id) continue;
      const idx = dateIndex.get(formatDateOnly(rec.date));
      if (idx == null) continue;
      values[idx]! += toNumber(rec.hours) ?? 0;
    }
    return {
      key: team.id,
      label: team.name,
      values: values.map(round2),
    };
  });

  const paceLines = filterTeamId
    ? await getPaceLines(tenantId, filterTeamId)
    : [];

  return {
    dates,
    view: "team",
    series,
    paceLines,
  };
}

export async function getDailyLoadTotal(
  tenantId: string,
  start: string,
  end: string,
): Promise<{ date: string; hours: number }[]> {
  const chart = await getLoadChart(tenantId, start, end, "category");
  return chart.dates.map((date, i) => ({
    date,
    hours: round2(
      chart.series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0),
    ),
  }));
}
