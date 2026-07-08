export const SCHEDULE_VISIBLE_MONTHS_KEY = "schedule-visible-months";
export const MIN_DAY_CELL_WIDTH = 24;
export const SCHEDULE_MONTH_DRAG_THRESHOLD_PX = 72;

export type ScheduleVisibleMonths = 1 | 2 | 3;

export function clampVisibleMonths(value: number): ScheduleVisibleMonths {
  if (!Number.isFinite(value)) return 1;
  const n = Math.round(value);
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return n as ScheduleVisibleMonths;
}

export function readStoredVisibleMonths(): ScheduleVisibleMonths {
  if (typeof window === "undefined") return 1;
  const raw = window.localStorage.getItem(SCHEDULE_VISIBLE_MONTHS_KEY);
  if (!raw) return 1;
  return clampVisibleMonths(Number(raw));
}

export function storeVisibleMonths(months: ScheduleVisibleMonths): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SCHEDULE_VISIBLE_MONTHS_KEY, String(months));
}

export type MonthDateGroup = {
  monthKey: string;
  label: string;
  dates: string[];
};

export function groupDatesByMonth(dates: string[]): MonthDateGroup[] {
  const groups: MonthDateGroup[] = [];
  for (const date of dates) {
    const monthKey = date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.monthKey === monthKey) {
      last.dates.push(date);
      continue;
    }
    const [y, m] = monthKey.split("-").map(Number);
    groups.push({
      monthKey,
      label: `${y}年${m}月`,
      dates: [date],
    });
  }
  return groups;
}

/** カレンダー領域の幅から日次セル幅を算出（下限あり） */
export function computeDayCellWidth(
  calendarAreaWidth: number,
  dayCount: number,
): { cellWidth: number; needsScroll: boolean } {
  if (dayCount <= 0 || calendarAreaWidth <= 0) {
    return { cellWidth: MIN_DAY_CELL_WIDTH, needsScroll: false };
  }
  const ideal = calendarAreaWidth / dayCount;
  if (ideal >= MIN_DAY_CELL_WIDTH) {
    return { cellWidth: ideal, needsScroll: false };
  }
  return { cellWidth: MIN_DAY_CELL_WIDTH, needsScroll: true };
}

export function formatScheduleRangeLabel(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  if (months <= 1) {
    return `${y}年${m}月`;
  }
  const end = new Date(Date.UTC(y!, m! - 1 + months, 0));
  const endY = end.getUTCFullYear();
  const endM = end.getUTCMonth() + 1;
  if (y === endY) {
    return `${y}年${m}月〜${endM}月`;
  }
  return `${y}年${m}月〜${endY}年${endM}月`;
}

/** ローカル日付の YYYY-MM-DD（スケジュールの「今日」判定用） */
export function todayDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 表示範囲に今日が含まれるか */
export function isTodayInScheduleRange(
  month: string,
  months: number,
  today: string,
): boolean {
  const start = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const end = new Date(Date.UTC(y!, m! - 1 + clampVisibleMonths(months), 0));
  const endStr = end.toISOString().slice(0, 10);
  return today >= start && today <= endStr;
}

/** 固定列（工程+指標）の概算幅 */
export const SCHEDULE_STICKY_COLS_WIDTH = {
  normal: 268,
  expanded: 360,
} as const;

export function measureDayCellWidth(
  frameWidth: number,
  dayCount: number,
  stickyWidth: number,
): number {
  const calendarWidth = Math.max(0, frameWidth - stickyWidth);
  return computeDayCellWidth(calendarWidth, dayCount).cellWidth;
}

export function snapMonthsFromDrag(
  startMonths: ScheduleVisibleMonths,
  deltaPx: number,
  side: "left" | "right",
): ScheduleVisibleMonths {
  const signed =
    side === "right" ? deltaPx : -deltaPx;
  const steps = Math.round(signed / SCHEDULE_MONTH_DRAG_THRESHOLD_PX);
  return clampVisibleMonths(startMonths + steps);
}
