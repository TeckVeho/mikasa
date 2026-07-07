import type { LoadChartDto } from "@logivoice/shared";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseDateOnly(input: string): Date {
  const [y, m, d] = input.split("T")[0]!.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** 直近3か月（当月を含む）の日付範囲 */
export function getInitialThreeMonthRange(): { start: string; end: string } {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  return { start: formatDateOnly(start), end: formatDateOnly(end) };
}

/** 指定開始日より前の3か月 */
export function getPreviousThreeMonthRange(beforeStart: string): {
  start: string;
  end: string;
} {
  const anchor = parseDateOnly(beforeStart);
  const end = addDays(anchor, -1);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 1));
  return { start: formatDateOnly(start), end: formatDateOnly(end) };
}

export function formatPeriodLabel(start: string, end: string): string {
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  return `${s.getUTCFullYear()}年${s.getUTCMonth() + 1}月 〜 ${e.getUTCFullYear()}年${e.getUTCMonth() + 1}月`;
}

function getWeekStart(dateStr: string): string {
  const d = parseDateOnly(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return formatDateOnly(addDays(d, -diff));
}

function formatWeekLabel(weekStart: string): string {
  const d = parseDateOnly(weekStart);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** 日次 LoadChart を週次に集約（班別=月次はそのまま） */
export function aggregateLoadChartWeekly(data: LoadChartDto): LoadChartDto {
  if (data.view === "team") return data;

  const weekBuckets = new Map<string, number[]>();
  const weekOrder: string[] = [];

  for (let i = 0; i < data.dates.length; i++) {
    const weekKey = getWeekStart(data.dates[i]!);
    if (!weekBuckets.has(weekKey)) {
      weekBuckets.set(weekKey, new Array(data.series.length).fill(0));
      weekOrder.push(weekKey);
    }
    const bucket = weekBuckets.get(weekKey)!;
    for (let s = 0; s < data.series.length; s++) {
      bucket[s]! += data.series[s]!.values[i] ?? 0;
    }
  }

  const series = data.series.map((s, sIdx) => ({
    ...s,
    values: weekOrder.map((wk) => round2(weekBuckets.get(wk)![sIdx]!)),
  }));

  const paceLines = data.paceLines.map((pl) => ({
    ...pl,
    value: round2(pl.value * 5),
  }));

  return {
    ...data,
    dates: weekOrder.map(formatWeekLabel),
    series,
    paceLines,
  };
}

/** 日次/月次チャートを日付順にマージ */
export function mergeLoadCharts(
  earlier: LoadChartDto,
  later: LoadChartDto,
): LoadChartDto {
  const dateSet = new Set([...earlier.dates, ...later.dates]);
  const dates = [...dateSet].sort();

  const earlierIndex = new Map(earlier.dates.map((d, i) => [d, i]));
  const laterIndex = new Map(later.dates.map((d, i) => [d, i]));

  const series = earlier.series.map((s) => {
    const laterSeries = later.series.find((x) => x.key === s.key);
    return {
      ...s,
      values: dates.map((d) => {
        let total = 0;
        const ei = earlierIndex.get(d);
        if (ei != null) total += s.values[ei] ?? 0;
        const li = laterIndex.get(d);
        if (li != null && laterSeries) total += laterSeries.values[li] ?? 0;
        return round2(total);
      }),
    };
  });

  return {
    dates,
    view: earlier.view,
    series,
    paceLines: later.paceLines.length > 0 ? later.paceLines : earlier.paceLines,
  };
}
