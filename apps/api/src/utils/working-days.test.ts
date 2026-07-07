import { describe, expect, it } from "vitest";
import { distributeEvenly, getDefaultWorkingDays } from "./working-days.js";
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
});
