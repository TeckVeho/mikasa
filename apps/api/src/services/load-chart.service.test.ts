import { describe, expect, it } from "vitest";
import { buildCategorySeries, normalizeLoadChartView } from "./load-chart.service.js";

describe("normalizeLoadChartView", () => {
  it("maps legacy total to category", () => {
    expect(normalizeLoadChartView("total")).toBe("category");
  });

  it("keeps process and team", () => {
    expect(normalizeLoadChartView("process")).toBe("process");
    expect(normalizeLoadChartView("team")).toBe("team");
  });

  it("defaults unknown to category", () => {
    expect(normalizeLoadChartView("unknown")).toBe("category");
  });
});

describe("buildCategorySeries", () => {
  it("splits welding, forging, and other", () => {
    const dates = ["2026-07-01", "2026-07-02"];
    const dateIndex = new Map(dates.map((d, i) => [d, i]));
    const series = buildCategorySeries(dates, dateIndex, [
      {
        date: new Date("2026-07-01T00:00:00Z"),
        hours: 4,
        processType: { id: "1", name: "組立前", isWelding: false },
      },
      {
        date: new Date("2026-07-01T00:00:00Z"),
        hours: 3,
        processType: { id: "2", name: "溶接", isWelding: true },
      },
      {
        date: new Date("2026-07-02T00:00:00Z"),
        hours: 2,
        processType: { id: "3", name: "その他", isWelding: false },
      },
    ]);

    expect(series).toHaveLength(3);
    expect(series[0]).toMatchObject({ key: "forging", label: "鍛冶作業", values: [4, 0] });
    expect(series[1]).toMatchObject({ key: "welding", label: "溶接作業", values: [3, 0] });
    expect(series[2]).toMatchObject({ key: "other", label: "その他", values: [0, 2] });
  });
});
