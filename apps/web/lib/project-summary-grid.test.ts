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
      plannedDailyHours: { "2026-01-05": 6 },
      actualDailyHours: { "2026-01-05": 4, "2026-01-06": 2 },
      dailyHours: {},
    },
    {
      processTypeId: "pt2",
      processTypeName: "溶接",
      targetHours: 50,
      actualHours: 4,
      progressRate: 8,
      plannedDailyHours: { "2026-01-05": 2 },
      actualDailyHours: { "2026-01-05": 4 },
      dailyHours: {},
    },
  ],
};

const dates = ["2026-01-05", "2026-01-06", "2026-01-07"];

describe("getSummaryCellTotalHours", () => {
  it("sums all process hours on a date by record type", () => {
    expect(getSummaryCellTotalHours(project, 0, dates, "actual")).toBe(8);
    expect(getSummaryCellTotalHours(project, 1, dates, "actual")).toBe(2);
    expect(getSummaryCellTotalHours(project, 0, dates, "planned")).toBe(8);
  });
});

describe("computeSummaryBlockMoveUpdates", () => {
  it("moves all process hours to the target date", () => {
    const payload = buildSummaryBlockDragPayloadForRow(
      "p1",
      project,
      dates,
      { row: 1, col: 0 },
      { row: 1, col: 0 },
      1,
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
      { row: 2, col: 1 },
    );
    expect(updates.get(0)).toEqual(
      expect.arrayContaining([
        { processTypeId: "pt1", date: "2026-01-05", hours: 0, recordType: "planned" },
        { processTypeId: "pt2", date: "2026-01-05", hours: 0, recordType: "planned" },
      ]),
    );
    expect(updates.get(2)).toEqual(
      expect.arrayContaining([
        { processTypeId: "pt1", date: "2026-01-05", hours: 0, recordType: "planned" },
        { processTypeId: "pt2", date: "2026-01-05", hours: 0, recordType: "planned" },
      ]),
    );
  });
});

describe("getSingleSelectionRow", () => {
  it("returns row when selection is on one summary row", () => {
    expect(
      getSingleSelectionRow({ row: 2, col: 1 }, { row: 2, col: 4 }),
    ).toBe(2);
  });

  it("returns null when selection spans multiple summary rows", () => {
    expect(
      getSingleSelectionRow({ row: 0, col: 1 }, { row: 2, col: 4 }),
    ).toBeNull();
  });
});
