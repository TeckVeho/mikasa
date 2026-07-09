import { describe, expect, it } from "vitest";
import type { TeamScheduleProjectDto } from "@logivoice/shared";
import {
  buildSummaryBlockDragPayloadForRow,
  computeSummaryBlockMoveUpdates,
  computeListSummaryClearUpdates,
  getSingleSelectionRow,
  getSummaryCellTotalHours,
} from "./project-summary-grid";

const project: TeamScheduleProjectDto = {
  projectId: "p1",
  projectNumber: "25X02",
  projectName: "テスト工事",
  deadline: null,
  status: "in_progress",
  clientName: null,
  weight: null,
  setCount: null,
  detail: null,
  plannedHours: 100,
  pastAverageHours: null,
  totalActualHours: 10,
  totalProgressRate: 10,
  processes: [
    {
      processTypeId: "pt1",
      processTypeName: "組立",
      targetHours: 50,
      actualHours: 6,
      progressRate: 12,
      plannedDailyHours: {},
      actualDailyHours: { "2026-01-05": 4, "2026-01-06": 2 },
      dailyHours: {},
    },
    {
      processTypeId: "pt2",
      processTypeName: "溶接",
      targetHours: 50,
      actualHours: 4,
      progressRate: 8,
      plannedDailyHours: {},
      actualDailyHours: { "2026-01-05": 4 },
      dailyHours: {},
    },
  ],
};

const dates = ["2026-01-05", "2026-01-06", "2026-01-07"];

describe("getSummaryCellTotalHours", () => {
  it("sums all process hours on a date", () => {
    expect(getSummaryCellTotalHours(project, 0, dates)).toBe(8);
    expect(getSummaryCellTotalHours(project, 1, dates)).toBe(2);
  });
});

describe("computeSummaryBlockMoveUpdates", () => {
  it("moves all process hours to the target date", () => {
    const payload = buildSummaryBlockDragPayloadForRow(
      "p1",
      project,
      dates,
      { row: 0, col: 0 },
      { row: 0, col: 0 },
      0,
    );
    expect(payload).not.toBeNull();

    const result = computeSummaryBlockMoveUpdates(
      payload!,
      2,
      dates,
      { rowCount: 1, colCount: dates.length },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.updates).toEqual(
      expect.arrayContaining([
        { processTypeId: "pt1", date: "2026-01-05", hours: 0, recordType: "actual" },
        { processTypeId: "pt2", date: "2026-01-05", hours: 0, recordType: "actual" },
        { processTypeId: "pt1", date: "2026-01-07", hours: 4, recordType: "actual" },
        { processTypeId: "pt2", date: "2026-01-07", hours: 4, recordType: "actual" },
      ]),
    );
  });
});

describe("computeListSummaryClearUpdates", () => {
  it("clears all processes in selected columns across rows", () => {
    const projects = [project, project];
    const updates = computeListSummaryClearUpdates(
      projects,
      dates,
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    );
    expect(updates.get(0)).toEqual(
      expect.arrayContaining([
        { processTypeId: "pt1", date: "2026-01-05", hours: 0, recordType: "actual" },
        { processTypeId: "pt2", date: "2026-01-05", hours: 0, recordType: "actual" },
      ]),
    );
    expect(updates.get(1)).toEqual(
      expect.arrayContaining([
        { processTypeId: "pt1", date: "2026-01-06", hours: 0, recordType: "actual" },
      ]),
    );
  });
});

describe("getSingleSelectionRow", () => {
  it("returns row when selection is on one project", () => {
    expect(
      getSingleSelectionRow({ row: 2, col: 1 }, { row: 2, col: 4 }),
    ).toBe(2);
  });

  it("returns null when selection spans multiple projects", () => {
    expect(
      getSingleSelectionRow({ row: 0, col: 1 }, { row: 2, col: 4 }),
    ).toBeNull();
  });
});
