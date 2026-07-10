"use client";

import type { TeamSummaryTotals } from "@/lib/project-schedule-summary";
import { PROCESS_SECTION_COLORS } from "@/lib/process-colors";
import { cn } from "@/lib/utils";
import {
  getScheduleTableStyles,
  SCHEDULE_GRID_BORDER,
  SCHEDULE_ROW_BORDER_ACTUAL,
  SCHEDULE_ROW_BORDER_PLANNED,
  SCHEDULE_STICKY_DIVIDER,
} from "@/lib/schedule-table-size";
import { SummaryRowKindCell } from "./SummaryRowKindCell";

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

  const metricCells = (
    <>
      <td
        rowSpan={2}
        className={cn(
          "text-center align-middle",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          PROCESS_SECTION_COLORS.forecast.cell,
        )}
      >
        {totals.plannedHours}
      </td>
      <td
        rowSpan={2}
        className={cn(
          "text-center align-middle",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          PROCESS_SECTION_COLORS.forecast.cell,
        )}
      >
        {totals.totalActualHours}
      </td>
      <td
        rowSpan={2}
        className={cn(
          "text-center align-middle",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          PROCESS_SECTION_COLORS.forecast.cell,
        )}
      >
        {totals.progressRate}%
      </td>
    </>
  );

  const rows: Array<{
    recordType: "planned" | "actual";
    rowLabel: string;
    rowBorder: string;
    dailyTotals: Record<string, number>;
  }> = [
    {
      recordType: "planned",
      rowLabel: "予定",
      rowBorder: SCHEDULE_ROW_BORDER_PLANNED,
      dailyTotals: totals.dailyPlannedTotals,
    },
    {
      recordType: "actual",
      rowLabel: "実績",
      rowBorder: SCHEDULE_ROW_BORDER_ACTUAL,
      dailyTotals: totals.dailyActualTotals,
    },
  ];

  return (
    <>
      {rows.map((rowDef, rowIndex) => (
        <tr
          key={rowDef.recordType}
          className={cn("border-t-2 border-border font-semibold", rowDef.rowBorder)}
        >
          {rowIndex === 0 && (
            <>
              <td
                rowSpan={2}
                className={cn(
                  "sticky left-0 z-10",
                  styles.processSticky,
                  SCHEDULE_STICKY_DIVIDER,
                  PROCESS_SECTION_COLORS.forecast.sticky,
                )}
              >
                <div>{label}</div>
              </td>
              {metricCells}
            </>
          )}
          <SummaryRowKindCell
            label={rowDef.rowLabel}
            className={PROCESS_SECTION_COLORS.forecast.cell}
          />
          {dates.map((date) => (
            <TotalDayCell
              key={date}
              hours={rowDef.dailyTotals[date] ?? 0}
              date={date}
              dayCellWidth={dayCellWidth}
              isHoliday={!!holidays[date]}
              isToday={today === date}
              showMonthDividers={showMonthHeaders}
            />
          ))}
        </tr>
      ))}
    </>
  );
}
