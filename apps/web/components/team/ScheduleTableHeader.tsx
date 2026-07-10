"use client";

import { cn } from "@/lib/utils";
import { groupDatesByMonth } from "@/lib/schedule-display";
import {
  getScheduleTableStyles,
  SCHEDULE_GRID_BORDER,
  SCHEDULE_STICKY_DIVIDER,
  type ScheduleTableSize,
} from "@/lib/schedule-table-size";

type Props = {
  dates: string[];
  holidays: Record<string, boolean>;
  today?: string;
  size?: ScheduleTableSize;
  dayCellWidth?: number;
  showMonthHeaders?: boolean;
  stickyLabel?: string;
  /** 折りたたみサマリー: 予定/実績の縦ラベル列 */
  showRowKindColumn?: boolean;
};

export function ScheduleTableHeader({
  dates,
  holidays,
  today,
  size = "normal",
  dayCellWidth,
  showMonthHeaders = false,
  stickyLabel = "工程",
  showRowKindColumn = false,
}: Props) {
  const styles = getScheduleTableStyles(size);
  const monthGroups = showMonthHeaders ? groupDatesByMonth(dates) : [];
  const stickyColSpan = showRowKindColumn ? 5 : 4;
  const dayWidthStyle =
    dayCellWidth != null
      ? { width: dayCellWidth, minWidth: dayCellWidth, maxWidth: dayCellWidth }
      : undefined;

  return (
    <thead>
      {showMonthHeaders && monthGroups.length > 1 && (
        <tr className={cn("border-b border-border/60 bg-bg text-muted", styles.thead)}>
          <th
            colSpan={stickyColSpan}
            className={cn("sticky left-0 z-10 bg-bg", styles.processSticky)}
          />
          {monthGroups.map((group, groupIndex) => (
            <th
              key={group.monthKey}
              colSpan={group.dates.length}
              className={cn(
                "px-1 py-1 text-center font-medium",
                groupIndex > 0 && "border-l-2 border-l-border",
              )}
            >
              {group.label}
            </th>
          ))}
        </tr>
      )}
      <tr className={cn("border-b border-border bg-bg text-muted", styles.thead)}>
        <th
          className={cn(
            "sticky left-0 z-10 bg-bg text-left",
            styles.processSticky,
            SCHEDULE_STICKY_DIVIDER,
          )}
        >
          {stickyLabel}
        </th>
        <th className={cn(styles.metricCell, SCHEDULE_GRID_BORDER)}>目標h</th>
        <th className={cn(styles.metricCell, SCHEDULE_GRID_BORDER)}>実績h</th>
        <th className={cn(styles.metricCell, SCHEDULE_GRID_BORDER)}>比率%</th>
        {showRowKindColumn && (
          <th
            className={cn(
              "w-[18px] min-w-[18px] max-w-[18px] p-0",
              SCHEDULE_GRID_BORDER,
            )}
            aria-hidden
          />
        )}
        {dates.map((d) => {
          const day = Number(d.slice(8));
          const isToday = today === d;
          const isMonthStart = day === 1;
          return (
            <th
              key={d}
              data-date={d}
              style={dayWidthStyle}
              className={cn(
                "text-center font-normal",
                SCHEDULE_GRID_BORDER,
                dayCellWidth == null && styles.dateTh,
                holidays[d] ? "text-muted" : "",
                isToday && "bg-amber-100 font-semibold text-amber-900",
                showMonthHeaders && isMonthStart && "border-l-2 border-l-border",
              )}
            >
              {day}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
