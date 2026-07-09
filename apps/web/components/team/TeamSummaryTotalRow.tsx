"use client";

import type { TeamSummaryTotals } from "@/lib/project-schedule-summary";
import { PROCESS_SECTION_COLORS } from "@/lib/process-colors";
import { cn } from "@/lib/utils";
import {
  getScheduleTableStyles,
  SCHEDULE_GRID_BORDER,
  SCHEDULE_STICKY_DIVIDER,
} from "@/lib/schedule-table-size";

type Props = {
  totals: TeamSummaryTotals;
  dates: string[];
  holidays: Record<string, boolean>;
  today?: string;
  dayCellWidth?: number;
  showMonthHeaders?: boolean;
  label?: string;
};

function TotalDayCell({
  hours,
  date,
  dayCellWidth,
  isHoliday,
  isToday,
  showMonthDividers,
}: {
  hours: number;
  date: string;
  dayCellWidth?: number;
  isHoliday: boolean;
  isToday: boolean;
  showMonthDividers: boolean;
}) {
  const day = Number(date.slice(8));
  const isMonthStart = day === 1;

  const widthStyle =
    dayCellWidth != null
      ? { width: dayCellWidth, minWidth: dayCellWidth, maxWidth: dayCellWidth }
      : undefined;

  return (
    <td
      data-date={date}
      style={widthStyle}
      className={cn(
        "text-center align-middle tabular-nums",
        SCHEDULE_GRID_BORDER,
        PROCESS_SECTION_COLORS.forecast.cell,
        dayCellWidth == null && "min-w-[36px]",
        "h-7 text-[11px]",
        isHoliday && "text-muted",
        isToday && "ring-1 ring-inset ring-amber-300",
        showMonthDividers && isMonthStart && "border-l-2 border-l-border",
      )}
    >
      {hours > 0 ? Math.round(hours) : ""}
    </td>
  );
}

export function TeamSummaryTotalRow({
  totals,
  dates,
  holidays,
  today,
  dayCellWidth,
  showMonthHeaders = false,
  label = "班合計",
}: Props) {
  const styles = getScheduleTableStyles("normal");

  return (
    <tr className="border-t-2 border-border font-semibold">
      <td
        className={cn(
          "sticky left-0 z-10",
          styles.processSticky,
          SCHEDULE_STICKY_DIVIDER,
          PROCESS_SECTION_COLORS.forecast.sticky,
        )}
      >
        {label}
      </td>
      <td
        className={cn(
          "text-center",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          PROCESS_SECTION_COLORS.forecast.cell,
        )}
      >
        {totals.plannedHours}
      </td>
      <td
        className={cn(
          "text-center",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          PROCESS_SECTION_COLORS.forecast.cell,
        )}
      >
        {totals.totalActualHours}
      </td>
      <td
        className={cn(
          "text-center",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          PROCESS_SECTION_COLORS.forecast.cell,
        )}
      >
        {totals.progressRate}%
      </td>
      {dates.map((date) => (
        <TotalDayCell
          key={date}
          hours={totals.dailyTotals[date] ?? 0}
          date={date}
          dayCellWidth={dayCellWidth}
          isHoliday={!!holidays[date]}
          isToday={today === date}
          showMonthDividers={showMonthHeaders}
        />
      ))}
    </tr>
  );
}
