import { describe, expect, it } from "vitest";
import {
  buildRegressionPoints,
  calculatePastAverageHours,
  fitLinearRegression,
} from "./model-calculation.js";

describe("fitLinearRegression", () => {
  it("2点から傾きと切片を推定する", () => {
    const points = [
      { x: 100, y: 10 },
      { x: 200, y: 20 },
    ];
    const fit = fitLinearRegression(points);
    expect(fit).toEqual({ a: 0.1, b: 0 });
  });

  it("箱型の既知係数に近い回帰を再現する", () => {
    const a = -0.0107;
    const b = 47.698;
    const samples = [
      { weight: 15, memberLength: 25, totalHours: 0 },
      { weight: 20, memberLength: 30, totalHours: 0 },
      { weight: 25, memberLength: 35, totalHours: 0 },
      { weight: 30, memberLength: 40, totalHours: 0 },
    ].map((s) => ({
      ...s,
      totalHours:
        calculatePastAverageHours(s.weight, s.memberLength, a, b) ?? 0,
    }));

    const fit = fitLinearRegression(buildRegressionPoints(samples));
    expect(fit).not.toBeNull();
    expect(fit!.a).toBeCloseTo(a, 3);
    expect(fit!.b).toBeCloseTo(b, 1);
  });
});

describe("buildRegressionPoints", () => {
  it("無効な実績は除外する", () => {
    const points = buildRegressionPoints([
      { weight: 0, memberLength: 10, totalHours: 100 },
      { weight: 10, memberLength: 0, totalHours: 100 },
      { weight: 10, memberLength: 10, totalHours: 0 },
      { weight: 10, memberLength: 10, totalHours: 500 },
    ]);
    expect(points).toEqual([{ x: 1000, y: 50 }]);
  });
});
