/** DB の hoursRatio は % 値そのもの（例: 5.6% → 5.6） */

export function normalizeSchedulePercent(percent: number): number {
  return Math.round(percent * 100) / 100;
}

/** 表示用: 小数第2位まで、末尾ゼロは省略（5.6 → "5.6", 10 → "10"） */
export function formatSchedulePercent(percent: number): string {
  if (!Number.isFinite(percent) || percent <= 0) return "";
  return Number(normalizeSchedulePercent(percent).toFixed(2)).toString();
}

export function sumScheduleWeights(
  patterns: readonly { hoursRatio: number }[],
): number {
  return patterns.reduce((sum, row) => sum + row.hoursRatio, 0);
}

export function sumSchedulePercents(
  patterns: readonly { hoursRatio: number }[],
): number {
  return normalizeSchedulePercent(sumScheduleWeights(patterns));
}

export function distributePlannedHoursByWeight(
  plannedHours: number,
  weight: number,
  weightSum: number,
): number {
  if (weightSum <= 0 || weight <= 0) return 0;
  return Math.round(((plannedHours * weight) / weightSum) * 100) / 100;
}

/** 工程目標時間 × モデルマスタの日次配分%（例: 5.6 → 5.6%） */
export function distributePlannedHoursByProcessPercent(
  processTargetHours: number,
  weightPercent: number,
): number {
  if (processTargetHours <= 0 || weightPercent <= 0) return 0;
  return Math.round(processTargetHours * (weightPercent / 100) * 100) / 100;
}

/** 旧形式（%÷100 で合計≈1）かどうか */
export function isLegacyScheduleRatioFormat(
  patterns: readonly { hoursRatio: number }[],
): boolean {
  if (patterns.length === 0) return false;
  const sum = sumScheduleWeights(patterns);
  return sum > 0 && sum <= 2;
}

type GridPercentCell = { value: string };

export function sumGridColumnPercents(
  rows: readonly (readonly GridPercentCell[])[],
  columnIndex: number,
): number {
  const patterns: { hoursRatio: number }[] = [];
  for (const row of rows) {
    const value = Number(row[columnIndex]?.value);
    if (!Number.isFinite(value) || value <= 0) continue;
    patterns.push({ hoursRatio: normalizeSchedulePercent(value) });
  }
  return sumSchedulePercents(patterns);
}

export function sumGridRowPercents(
  rows: readonly (readonly GridPercentCell[])[],
  rowIndex: number,
): number {
  const row = rows[rowIndex];
  if (!row) return 0;
  const patterns: { hoursRatio: number }[] = [];
  for (const cell of row) {
    const value = Number(cell.value);
    if (!Number.isFinite(value) || value <= 0) continue;
    patterns.push({ hoursRatio: normalizeSchedulePercent(value) });
  }
  return sumSchedulePercents(patterns);
}

export function sumGridPercents(
  rows: readonly (readonly GridPercentCell[])[],
): number {
  const patterns: { hoursRatio: number }[] = [];
  for (const row of rows) {
    for (const cell of row) {
      const value = Number(cell.value);
      if (!Number.isFinite(value) || value <= 0) continue;
      patterns.push({ hoursRatio: normalizeSchedulePercent(value) });
    }
  }
  return sumSchedulePercents(patterns);
}
