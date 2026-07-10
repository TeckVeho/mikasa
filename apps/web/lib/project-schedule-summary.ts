import type { TeamScheduleProjectDto } from "@logivoice/shared";

export type DayProcessSegment = {
  processTypeId: string;
  processTypeName: string;
  hours: number;
};

/** 指定日の予定時間を工程ごとに集約（サマリー行の色分け表示用） */
export function getDayPlannedProcessSegments(
  project: TeamScheduleProjectDto,
  date: string,
): DayProcessSegment[] {
  const segments: DayProcessSegment[] = [];
  for (const proc of project.processes) {
    const hours = proc.plannedDailyHours[date] ?? 0;
    if (hours > 0) {
      segments.push({
        processTypeId: proc.processTypeId,
        processTypeName: proc.processTypeName,
        hours,
      });
    }
  }
  return segments;
}

/** 指定日の実績時間を工程ごとに集約（サマリー行の色分け表示用） */
export function getDayProcessSegments(
  project: TeamScheduleProjectDto,
  date: string,
): DayProcessSegment[] {
  const segments: DayProcessSegment[] = [];
  for (const proc of project.processes) {
    const hours =
      proc.actualDailyHours[date] ?? proc.dailyHours[date] ?? 0;
    if (hours > 0) {
      segments.push({
        processTypeId: proc.processTypeId,
        processTypeName: proc.processTypeName,
        hours,
      });
    }
  }
  return segments;
}

export function getDayProcessSegmentsByRecordType(
  project: TeamScheduleProjectDto,
  date: string,
  recordType: "planned" | "actual",
): DayProcessSegment[] {
  return recordType === "planned"
    ? getDayPlannedProcessSegments(project, date)
    : getDayProcessSegments(project, date);
}

export function getDayTotalPlannedHours(
  project: TeamScheduleProjectDto,
  date: string,
): number {
  return getDayPlannedProcessSegments(project, date).reduce(
    (sum, s) => sum + s.hours,
    0,
  );
}

export function getDayTotalActualHours(
  project: TeamScheduleProjectDto,
  date: string,
): number {
  return getDayProcessSegments(project, date).reduce((sum, s) => sum + s.hours, 0);
}

export type TeamSummaryTotals = {
  plannedHours: number;
  totalActualHours: number;
  progressRate: number;
  /** @deprecated dailyActualTotals を使用 */
  dailyTotals: Record<string, number>;
  dailyPlannedTotals: Record<string, number>;
  dailyActualTotals: Record<string, number>;
};

export function summaryProjectIndexFromRow(row: number): number {
  return Math.floor(row / 2);
}

export function isSummaryPlannedRow(row: number): boolean {
  return row % 2 === 0;
}

export function summaryRecordTypeFromRow(
  row: number,
): "planned" | "actual" {
  return isSummaryPlannedRow(row) ? "planned" : "actual";
}

/** 班内の全サマリー行を集計 */
export function computeTeamSummaryTotals(
  projects: TeamScheduleProjectDto[],
  dates: string[],
): TeamSummaryTotals {
  let plannedHours = 0;
  let totalActualHours = 0;
  const dailyPlannedTotals: Record<string, number> = {};
  const dailyActualTotals: Record<string, number> = {};

  for (const date of dates) {
    dailyPlannedTotals[date] = 0;
    dailyActualTotals[date] = 0;
  }

  for (const project of projects) {
    plannedHours += project.plannedHours;
    totalActualHours += project.totalActualHours;

    for (const date of dates) {
      dailyPlannedTotals[date] =
        (dailyPlannedTotals[date] ?? 0) + getDayTotalPlannedHours(project, date);
      dailyActualTotals[date] =
        (dailyActualTotals[date] ?? 0) + getDayTotalActualHours(project, date);
    }
  }

  const progressRate =
    plannedHours > 0
      ? Math.round((totalActualHours / plannedHours) * 100)
      : 0;

  return {
    plannedHours,
    totalActualHours,
    progressRate,
    dailyTotals: dailyActualTotals,
    dailyPlannedTotals,
    dailyActualTotals,
  };
}

export const TEAM_SCHEDULE_EXPANDED_KEY = "team-schedule-expanded-projects";

export function readExpandedProjectIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(TEAM_SCHEDULE_EXPANDED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function storeExpandedProjectIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    TEAM_SCHEDULE_EXPANDED_KEY,
    JSON.stringify([...ids]),
  );
}
