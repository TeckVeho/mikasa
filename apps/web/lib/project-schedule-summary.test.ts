import { describe, expect, it } from "vitest";
import type { TeamScheduleProjectDto } from "@logivoice/shared";
import {
  computeTeamSummaryTotals,
  getDayProcessSegments,
  getDayTotalActualHours,
} from "./project-schedule-summary";

const project: TeamScheduleProjectDto = {
  projectId: "p1",
  projectNumber: "25X02",
  projectName: "テスト工事",
  deadline: "2026-03-01",
  status: "in_progress",
  clientName: "客先A",
  weight: 10,
  setCount: 2,
  detail: null,
  plannedHours: 100,
  pastAverageHours: 90,
  totalActualHours: 30,
  totalProgressRate: 30,
  processes: [
    {
      processTypeId: "pt1",
      processTypeName: "組立",
      targetHours: 50,
      actualHours: 20,
      progressRate: 40,
      plannedDailyHours: {},
      actualDailyHours: { "2026-01-05": 4 },
      dailyHours: {},
    },
    {
      processTypeId: "pt2",
      processTypeName: "溶接",
      targetHours: 50,
      actualHours: 10,
      progressRate: 20,
      plannedDailyHours: {},
      actualDailyHours: { "2026-01-05": 2 },
      dailyHours: {},
    },
    {
      processTypeId: "pt3",
      processTypeName: "塗装",
      targetHours: 0,
      actualHours: 0,
      progressRate: 0,
      plannedDailyHours: {},
      actualDailyHours: {},
      dailyHours: {},
    },
  ],
};

describe("getDayProcessSegments", () => {
  it("returns only processes with hours on the date", () => {
    const segments = getDayProcessSegments(project, "2026-01-05");
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      processTypeName: "組立",
      hours: 4,
    });
    expect(segments[1]).toMatchObject({
      processTypeName: "溶接",
      hours: 2,
    });
  });

  it("returns empty array when no hours", () => {
    expect(getDayProcessSegments(project, "2026-01-06")).toEqual([]);
  });

  it("falls back to dailyHours when actualDailyHours missing", () => {
    const withLegacy = {
      ...project,
      processes: [
        {
          ...project.processes[0]!,
          actualDailyHours: {},
          dailyHours: { "2026-01-07": 3 },
        },
      ],
    };
    expect(getDayProcessSegments(withLegacy, "2026-01-07")).toEqual([
      expect.objectContaining({ hours: 3 }),
    ]);
  });
});

describe("getDayTotalActualHours", () => {
  it("sums segment hours", () => {
    expect(getDayTotalActualHours(project, "2026-01-05")).toBe(6);
  });
});

describe("computeTeamSummaryTotals", () => {
  const dates = ["2026-01-05", "2026-01-06"];

  it("aggregates metrics and daily hours across projects", () => {
    const other: TeamScheduleProjectDto = {
      ...project,
      projectId: "p2",
      plannedHours: 50,
      totalActualHours: 10,
      processes: [
        {
          ...project.processes[0]!,
          actualDailyHours: { "2026-01-05": 3 },
        },
      ],
    };

    const totals = computeTeamSummaryTotals([project, other], dates);

    expect(totals.plannedHours).toBe(150);
    expect(totals.totalActualHours).toBe(40);
    expect(totals.progressRate).toBe(27);
    expect(totals.dailyTotals["2026-01-05"]).toBe(9);
  });
});
