import { describe, expect, it } from "vitest";
import {
  distributeEvenly,
  getDefaultWorkingDays,
  getNthWorkingDay,
} from "./working-days.js";
import { parseDateOnly } from "./date.js";

describe("working-days", () => {
  it("excludes weekends and holidays", () => {
    const start = parseDateOnly("2026-07-06"); // Monday
    const end = parseDateOnly("2026-07-12"); // Sunday
    const holidays = new Set<string>();
    const days = getDefaultWorkingDays(start, end, holidays);
    expect(days).toHaveLength(5);
  });

  it("distributes hours evenly across working days", () => {
    const start = parseDateOnly("2026-07-06");
    const end = parseDateOnly("2026-07-10");
    const days = getDefaultWorkingDays(start, end, new Set());
    const dist = distributeEvenly(10, days);
    const values = [...dist.values()];
    expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 1);
    expect(values.every((v) => v === 2)).toBe(true);
  });

  it("returns nth working day skipping weekends and holidays", () => {
    const start = parseDateOnly("2026-07-03"); // Friday
    const holidays = new Set<string>(["2026-07-07"]);

    expect(getNthWorkingDay(start, 0, holidays)?.toISOString().slice(0, 10)).toBe(
      "2026-07-03",
    );
    expect(getNthWorkingDay(start, 1, holidays)?.toISOString().slice(0, 10)).toBe(
      "2026-07-06",
    );
    expect(getNthWorkingDay(start, 2, holidays)?.toISOString().slice(0, 10)).toBe(
      "2026-07-08",
    );
  });
});
