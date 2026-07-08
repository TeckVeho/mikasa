import { describe, expect, it } from "vitest";
import {
  distributePlannedHoursByWeight,
  distributePlannedHoursByProcessPercent,
  formatSchedulePercent,
  isLegacyScheduleRatioFormat,
  normalizeSchedulePercent,
  sumGridColumnPercents,
  sumGridPercents,
  sumGridRowPercents,
  sumSchedulePercents,
} from "./schedule-model.js";

describe("schedule-model", () => {
  it("formats percent without trailing zeros", () => {
    expect(formatSchedulePercent(5.6)).toBe("5.6");
    expect(formatSchedulePercent(10)).toBe("10");
    expect(formatSchedulePercent(15)).toBe("15");
    expect(formatSchedulePercent(8.7)).toBe("8.7");
    expect(formatSchedulePercent(5.65)).toBe("5.65");
  });

  it("distributes planned hours by percent weight sum", () => {
    const hours = distributePlannedHoursByWeight(100, 5.6, 5.6 + 9.4);
    expect(hours).toBe(37.33);
  });

  it("distributes process target by model percent", () => {
    expect(distributePlannedHoursByProcessPercent(215.1, 5.6)).toBe(12.05);
    expect(distributePlannedHoursByProcessPercent(112.2, 9.4)).toBe(10.55);
  });

  it("sums percents", () => {
    expect(
      sumSchedulePercents([{ hoursRatio: 5.6 }, { hoursRatio: 9.4 }]),
    ).toBe(15);
  });

  it("detects legacy ratio format", () => {
    expect(isLegacyScheduleRatioFormat([{ hoursRatio: 0.056 }])).toBe(true);
    expect(isLegacyScheduleRatioFormat([{ hoursRatio: 5.6 }])).toBe(false);
  });

  it("sums grid column and total percents from display values", () => {
    const grid = [
      [{ value: "5.6" }, { value: "" }],
      [{ value: "" }, { value: "9.4" }],
    ];
    expect(sumGridColumnPercents(grid, 0)).toBe(5.6);
    expect(sumGridColumnPercents(grid, 1)).toBe(9.4);
    expect(sumGridRowPercents(grid, 0)).toBe(5.6);
    expect(sumGridRowPercents(grid, 1)).toBe(9.4);
    expect(sumGridPercents(grid)).toBe(15);
  });

  it("normalizes to 2 decimal places", () => {
    expect(normalizeSchedulePercent(5.605)).toBe(5.61);
    expect(normalizeSchedulePercent(5.604)).toBe(5.6);
  });
});
