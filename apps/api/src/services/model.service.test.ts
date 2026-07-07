import { describe, expect, it } from "vitest";
import {
  buildProcessTargets,
  calculatePastAverageHours,
  weldingRatioFromTargets,
} from "@logivoice/shared";

describe("calculatePastAverageHours", () => {
  it("箱型の回帰式（Excel モデルシート H30）", () => {
    // H28=20t, H29=30m → H30=811.293...
    const hours = calculatePastAverageHours(20, 30, -0.0107, 47.698);
    expect(hours).toBe(811.3);
  });

  it("無効な入力は null", () => {
    expect(calculatePastAverageHours(0, 30, -0.0107, 47.698)).toBeNull();
    expect(calculatePastAverageHours(20, 0, -0.0107, 47.698)).toBeNull();
  });
});

describe("buildProcessTargets", () => {
  const processes = [
    { name: "組立前", defaultRatio: 0.249 },
    { name: "組立", defaultRatio: 0.167 },
    { name: "溶接", defaultRatio: 0.203 },
    { name: "歪取り", defaultRatio: 0.055 },
    { name: "塗装", defaultRatio: 0.073 },
    { name: "仕上げ", defaultRatio: 0.258 },
  ];

  it("品種別比率で工程目標を配分する", () => {
    const ratios = {
      組立前: 0.261,
      組立: 0.106,
      溶接: 0.335,
      歪取り: 0.067,
      塗装: 0.056,
      仕上げ: 0.174,
    };
    const targets = buildProcessTargets(1000, processes, ratios);
    expect(targets.find((t) => t.processName === "溶接")?.targetHours).toBe(335);
    expect(weldingRatioFromTargets(targets)).toBe(0.335);
  });
});
