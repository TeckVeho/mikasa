export const PROCESS_NAMES = [
  "組立前",
  "組立",
  "溶接",
  "歪取り",
  "塗装",
  "仕上げ",
] as const;

export type ProcessName = (typeof PROCESS_NAMES)[number];
export type ProcessRatiosMap = Record<string, number>;

export type ProductModelConfig = {
  regressionA: number;
  regressionB: number;
  processRatios: ProcessRatiosMap;
};

/** 泉北工程.xlsx モデルシート: ((t/M*1000)*a + b) * t */
export function calculatePastAverageHours(
  weightT: number,
  memberLengthM: number,
  regressionA: number,
  regressionB: number,
): number | null {
  if (
    !Number.isFinite(weightT) ||
    !Number.isFinite(memberLengthM) ||
    weightT <= 0 ||
    memberLengthM <= 0
  ) {
    return null;
  }
  const hoursPerTon = (weightT / memberLengthM) * 1000 * regressionA + regressionB;
  return round1(hoursPerTon * weightT);
}

export type RegressionPoint = { x: number; y: number };

export type RegressionSample = {
  weight: number;
  memberLength: number;
  totalHours: number;
};

/** 実績から回帰用の (x, y) 点列を生成。x=(t/M×1000), y=時間/t */
export function buildRegressionPoints(
  samples: RegressionSample[],
): RegressionPoint[] {
  const points: RegressionPoint[] = [];
  for (const sample of samples) {
    const { weight, memberLength, totalHours } = sample;
    if (
      !Number.isFinite(weight) ||
      !Number.isFinite(memberLength) ||
      !Number.isFinite(totalHours) ||
      weight <= 0 ||
      memberLength <= 0 ||
      totalHours <= 0
    ) {
      continue;
    }
    points.push({
      x: (weight / memberLength) * 1000,
      y: totalHours / weight,
    });
  }
  return points;
}

/** 最小二乗法で y = ax + b を推定 */
export function fitLinearRegression(
  points: RegressionPoint[],
): { a: number; b: number } | null {
  if (points.length < 2) return null;

  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const { x, y } of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    n += 1;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  if (n < 2) return null;

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;

  const a = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / n;
  return { a, b };
}

export function computeProcessRatiosFromTotals(
  processTotals: Record<string, number>,
): ProcessRatiosMap | null {
  const grandTotal = Object.values(processTotals).reduce((sum, hours) => sum + hours, 0);
  if (grandTotal <= 0) return null;

  const out: ProcessRatiosMap = {};
  for (const [name, hours] of Object.entries(processTotals)) {
    if (hours > 0) {
      out[name] = hours / grandTotal;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function parseProcessRatios(value: unknown): ProcessRatiosMap | null {
  if (!value || typeof value !== "object") return null;
  const out: ProcessRatiosMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      out[key] = raw;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function resolveProcessRatio(
  processName: string,
  productRatios: ProcessRatiosMap | null | undefined,
  defaultRatio: number,
): number {
  if (productRatios && processName in productRatios) {
    return productRatios[processName]!;
  }
  return defaultRatio;
}

export type ProcessTargetDto = {
  processName: string;
  ratio: number;
  targetHours: number;
};

export function buildProcessTargets(
  plannedHours: number,
  processNames: { name: string; defaultRatio: number }[],
  productRatios: ProcessRatiosMap | null | undefined,
): ProcessTargetDto[] {
  return processNames.map((pt) => {
    const ratio = resolveProcessRatio(pt.name, productRatios, pt.defaultRatio);
    return {
      processName: pt.name,
      ratio,
      targetHours: round1(plannedHours * ratio),
    };
  });
}

export function weldingRatioFromTargets(targets: ProcessTargetDto[]): number | null {
  const welding = targets.find((t) => t.processName === "溶接");
  return welding ? welding.ratio : null;
}
