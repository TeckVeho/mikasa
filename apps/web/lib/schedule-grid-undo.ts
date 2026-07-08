import type { TeamScheduleDto, TeamScheduleProjectDto } from "@logivoice/shared";
import type { ScheduleCellUpdate } from "./schedule-grid-clipboard";

function readCellHours(
  proc: TeamScheduleProjectDto["processes"][number] | undefined,
  date: string,
  recordType: "planned" | "actual",
): number {
  if (!proc) return 0;
  if (recordType === "planned") {
    return proc.plannedDailyHours[date] ?? 0;
  }
  return proc.actualDailyHours[date] ?? proc.dailyHours[date] ?? 0;
}

export type ScheduleUndoEntry = {
  teamId: string;
  projectId: string;
  restore: ScheduleCellUpdate[];
};

export function buildUndoSnapshot(
  schedules: TeamScheduleDto[],
  teamId: string,
  projectId: string,
  updates: ScheduleCellUpdate[],
): ScheduleCellUpdate[] {
  const project = schedules
    .find((s) => s.teamId === teamId)
    ?.projects.find((p) => p.projectId === projectId);
  if (!project) return [];

  return updates.map((u) => {
    const proc = project.processes.find((p) => p.processTypeId === u.processTypeId);
    const recordType = u.recordType ?? "actual";
    return {
      processTypeId: u.processTypeId,
      date: u.date,
      hours: readCellHours(proc, u.date, recordType),
      recordType,
    };
  });
}

export function buildProjectScheduleUndoSnapshot(
  project: TeamScheduleProjectDto,
  updates: ScheduleCellUpdate[],
): ScheduleCellUpdate[] {
  return updates.map((u) => {
    const proc = project.processes.find((p) => p.processTypeId === u.processTypeId);
    const recordType = u.recordType ?? "planned";
    return {
      processTypeId: u.processTypeId,
      date: u.date,
      hours: readCellHours(proc, u.date, recordType),
      recordType,
    };
  });
}
