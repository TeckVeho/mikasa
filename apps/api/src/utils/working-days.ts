import { addDays, eachDateInclusive, parseDateOnly } from "./date.js";

export function filterWorkingDays(
  dates: Date[],
  holidaySet: Set<string>,
): Date[] {
  return dates.filter((d) => {
    const key = d.toISOString().slice(0, 10);
    return !holidaySet.has(key);
  });
}

export function getWorkingDaysInRange(
  startDate: Date,
  endDate: Date,
  holidaySet: Set<string>,
): Date[] {
  return filterWorkingDays(eachDateInclusive(startDate, endDate), holidaySet);
}

export function distributeEvenly(
  totalHours: number,
  workingDays: Date[],
): Map<string, number> {
  const result = new Map<string, number>();
  if (workingDays.length === 0 || totalHours <= 0) return result;

  const perDay = totalHours / workingDays.length;
  let allocated = 0;
  for (let i = 0; i < workingDays.length; i++) {
    const key = workingDays[i]!.toISOString().slice(0, 10);
    const hours =
      i === workingDays.length - 1
        ? Math.round((totalHours - allocated) * 100) / 100
        : Math.round(perDay * 100) / 100;
    result.set(key, hours);
    allocated += hours;
  }
  return result;
}

export function buildHolidaySet(
  calendarDays: { date: Date; isHoliday: boolean }[],
): Set<string> {
  const set = new Set<string>();
  for (const day of calendarDays) {
    if (day.isHoliday) {
      set.add(day.date.toISOString().slice(0, 10));
    }
  }
  return set;
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function getDefaultWorkingDays(
  startDate: Date,
  endDate: Date,
  holidaySet: Set<string>,
): Date[] {
  return eachDateInclusive(startDate, endDate).filter((d) => {
    const key = d.toISOString().slice(0, 10);
    if (holidaySet.has(key)) return false;
    return !isWeekend(d);
  });
}

export function isWorkingDay(date: Date, holidaySet: Set<string>): boolean {
  const key = date.toISOString().slice(0, 10);
  if (holidaySet.has(key)) return false;
  return !isWeekend(date);
}

/** startDate から数えて dayOffset 番目（0始まり）の稼働日を返す */
export function getNthWorkingDay(
  startDate: Date,
  dayOffset: number,
  holidaySet: Set<string>,
): Date | null {
  if (dayOffset < 0) return null;

  let current = new Date(startDate);
  let workingDayIndex = -1;
  const maxIterations = Math.max(366, (dayOffset + 1) * 4);

  for (let i = 0; i < maxIterations; i++) {
    if (isWorkingDay(current, holidaySet)) {
      workingDayIndex++;
      if (workingDayIndex === dayOffset) {
        return current;
      }
    }
    current = addDays(current, 1);
  }

  return null;
}

/** 稼働日数分のカレンダー日数の上限見積もり（土日・祝日バッファ込み） */
export function estimateCalendarSpanForWorkingDays(workingDays: number): number {
  return workingDays * 3 + 14;
}

export { parseDateOnly };
