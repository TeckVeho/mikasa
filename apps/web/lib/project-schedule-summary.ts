import type { TeamScheduleProjectDto } from "@logivoice/shared";

export type DayProcessSegment = {
  processTypeId: string;
  processTypeName: string;
  hours: number;
};

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
  dailyTotals: Record<string, number>;
};

/** 班内の全サマリー行を集計 */
export function computeTeamSummaryTotals(
  projects: TeamScheduleProjectDto[],
  dates: string[],
): TeamSummaryTotals {
  let plannedHours = 0;
  let totalActualHours = 0;
  const dailyTotals: Record<string, number> = {};

  for (const date of dates) {
    dailyTotals[date] = 0;
  }

  for (const project of projects) {
    plannedHours += project.plannedHours;
    totalActualHours += project.totalActualHours;

    for (const date of dates) {
      dailyTotals[date] = (dailyTotals[date] ?? 0) + getDayTotalActualHours(project, date);
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
    dailyTotals,
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
