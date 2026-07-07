import type { TeamScheduleDto } from "@logivoice/shared";
import type { ScheduleCellUpdate } from "./schedule-grid-clipboard";

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
    return {
      processTypeId: u.processTypeId,
      date: u.date,
      hours: proc?.dailyHours[u.date] ?? 0,
    };
  });
}
