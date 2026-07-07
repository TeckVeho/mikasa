import { describe, expect, it } from "vitest";
import {
  clampVisibleMonths,
  computeDayCellWidth,
  groupDatesByMonth,
  isTodayInScheduleRange,
  snapMonthsFromDrag,
} from "./schedule-display";

describe("schedule-display", () => {
  it("clampVisibleMonths", () => {
    expect(clampVisibleMonths(0)).toBe(1);
    expect(clampVisibleMonths(2)).toBe(2);
    expect(clampVisibleMonths(5)).toBe(3);
  });

  it("groupDatesByMonth", () => {
    const groups = groupDatesByMonth(["2026-07-30", "2026-07-31", "2026-08-01"]);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.dates).toHaveLength(2);
    expect(groups[1]!.label).toBe("2026年8月");
  });

  it("computeDayCellWidth shrinks until min then scrolls", () => {
    expect(computeDayCellWidth(900, 30).cellWidth).toBe(30);
    expect(computeDayCellWidth(900, 30).needsScroll).toBe(false);
    const tight = computeDayCellWidth(600, 90);
    expect(tight.cellWidth).toBe(24);
    expect(tight.needsScroll).toBe(true);
  });

  it("snapMonthsFromDrag", () => {
    expect(snapMonthsFromDrag(1, 80, "right")).toBe(2);
    expect(snapMonthsFromDrag(2, -80, "left")).toBe(3);
    expect(snapMonthsFromDrag(2, 80, "left")).toBe(1);
    expect(snapMonthsFromDrag(2, 80, "right")).toBe(3);
  });

  it("isTodayInScheduleRange", () => {
    expect(isTodayInScheduleRange("2026-07", 1, "2026-07-15")).toBe(true);
    expect(isTodayInScheduleRange("2026-07", 1, "2026-08-01")).toBe(false);
    expect(isTodayInScheduleRange("2026-07", 3, "2026-09-15")).toBe(true);
  });
});
