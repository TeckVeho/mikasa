import { describe, expect, it } from "vitest";
import { buildPlannedEntries } from "./schedule-model.service.js";

const emptyHolidaySet = new Set<string>();

describe("buildPlannedEntries", () => {
  it("distributes each process target by model percent", () => {
    const processTargetHoursById = new Map([
      ["p1", 100],
      ["p2", 100],
    ]);
    const preview = buildPlannedEntries(
      {
        id: "model-1",
        totalDays: 3,
        dayPatterns: [
          {
            processTypeId: "p1",
            processTypeName: "組立前",
            dayOffset: 0,
            hoursRatio: 60,
          },
          {
            processTypeId: "p2",
            processTypeName: "組立",
            dayOffset: 1,
            hoursRatio: 40,
          },
        ],
        ratioSum: 100,
      },
      new Date("2026-07-01T00:00:00Z"),
      200,
      processTargetHoursById,
      emptyHolidaySet,
    );

    expect(preview.startDate).toBe("2026-07-01");
    expect(preview.endDate).toBe("2026-07-03");
    expect(preview.dailySchedule).toEqual([
      {
        date: "2026-07-01",
        processTypeId: "p1",
        processTypeName: "組立前",
        hours: 60,
      },
      {
        date: "2026-07-02",
        processTypeId: "p2",
        processTypeName: "組立",
        hours: 40,
      },
    ]);
  });

  it("uses process target hours with daily percent weights", () => {
    const processTargetHoursById = new Map([
      ["p1", 215.1],
      ["p2", 112.2],
    ]);
    const preview = buildPlannedEntries(
      {
        id: "model-2",
        totalDays: 2,
        dayPatterns: [
          {
            processTypeId: "p1",
            processTypeName: "組立前",
            dayOffset: 0,
            hoursRatio: 5.6,
          },
          {
            processTypeId: "p2",
            processTypeName: "組立",
            dayOffset: 1,
            hoursRatio: 9.4,
          },
        ],
        ratioSum: 15,
      },
      new Date("2026-07-01T00:00:00Z"),
      327.3,
      processTargetHoursById,
      emptyHolidaySet,
    );

    expect(preview.dailySchedule).toEqual([
      {
        date: "2026-07-01",
        processTypeId: "p1",
        processTypeName: "組立前",
        hours: 12.05,
      },
      {
        date: "2026-07-02",
        processTypeId: "p2",
        processTypeName: "組立",
        hours: 10.55,
      },
    ]);
  });

  it("skips weekends and holidays when mapping day offsets", () => {
    const processTargetHoursById = new Map([
      ["p1", 100],
      ["p2", 100],
    ]);
    const holidaySet = new Set<string>(["2026-07-07"]);
    const preview = buildPlannedEntries(
      {
        id: "model-3",
        totalDays: 3,
        dayPatterns: [
          {
            processTypeId: "p1",
            processTypeName: "組立前",
            dayOffset: 0,
            hoursRatio: 50,
          },
          {
            processTypeId: "p2",
            processTypeName: "組立",
            dayOffset: 1,
            hoursRatio: 50,
          },
        ],
        ratioSum: 100,
      },
      new Date("2026-07-03T00:00:00Z"),
      200,
      processTargetHoursById,
      holidaySet,
    );

    expect(preview.dailySchedule).toEqual([
      {
        date: "2026-07-03",
        processTypeId: "p1",
        processTypeName: "組立前",
        hours: 50,
      },
      {
        date: "2026-07-06",
        processTypeId: "p2",
        processTypeName: "組立",
        hours: 50,
      },
    ]);
    expect(preview.endDate).toBe("2026-07-08");
  });
});
