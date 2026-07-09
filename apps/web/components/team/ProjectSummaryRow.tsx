"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { TeamScheduleProjectDto } from "@logivoice/shared";
import { PROJECT_STATUS_LABELS } from "@logivoice/shared";
import { getDayProcessSegments } from "@/lib/project-schedule-summary";
import type { useTeamSummaryGrid } from "@/hooks/useTeamSummaryGrid";
import { cn } from "@/lib/utils";
import {
  getScheduleTableStyles,
  SCHEDULE_GRID_BORDER,
  SCHEDULE_STICKY_DIVIDER,
} from "@/lib/schedule-table-size";
import { SummaryInteractiveDayCell } from "./SummaryInteractiveDayCell";

type GridApi = ReturnType<typeof useTeamSummaryGrid>;

type Props = {
  project: TeamScheduleProjectDto;
  dates: string[];
  holidays: Record<string, boolean>;
  today?: string;
  dayCellWidth?: number;
  showMonthHeaders?: boolean;
  isExpanded: boolean;
  gridRow: number;
  grid: GridApi;
  onToggle: () => void;
};

export function ProjectSummaryRow({
  project,
  dates,
  holidays,
  today,
  dayCellWidth,
  showMonthHeaders = false,
  isExpanded,
  gridRow,
  grid,
  onToggle,
}: Props) {
  const styles = getScheduleTableStyles("normal");

  return (
    <tr
      className={cn(
        "border-b border-border/80 transition-colors",
        isExpanded && "bg-primary/5",
      )}
    >
      <td
        className={cn(
          "sticky left-0 z-10 cursor-pointer bg-white transition-colors hover:bg-primary/5",
          styles.processSticky,
          SCHEDULE_STICKY_DIVIDER,
          isExpanded && "bg-primary/5",
        )}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start gap-1.5">
          <span className="mt-0.5 shrink-0 text-muted">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-semibold text-text">{project.projectNumber}</span>
              <span className="truncate text-text">{project.projectName}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted">
              {project.deadline && <span>納期: {project.deadline}</span>}
              <span>{PROJECT_STATUS_LABELS[project.status]}</span>
              {project.clientName && <span>客先: {project.clientName}</span>}
              {project.weight != null && <span>{project.weight}t</span>}
              {project.setCount != null && <span>SET: {project.setCount}</span>}
            </div>
          </div>
        </div>
      </td>
      <td
        className={cn(
          "text-center",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          "bg-white",
        )}
      >
        {project.plannedHours}
      </td>
      <td
        className={cn(
          "text-center",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          "bg-white",
        )}
      >
        {project.totalActualHours}
      </td>
      <td
        className={cn(
          "text-center",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          "bg-white",
        )}
      >
        {project.totalProgressRate}%
      </td>
      {dates.map((date, col) => {
        const interaction = grid.getCellInteraction(gridRow, col);
        return (
          <SummaryInteractiveDayCell
            key={date}
            date={date}
            row={interaction.row}
            col={interaction.col}
            segments={getDayProcessSegments(project, date)}
            dayCellWidth={dayCellWidth}
            showMonthDividers={showMonthHeaders}
            isHoliday={!!holidays[date]}
            isToday={today === date}
            isActive={interaction.isActive}
            isSelected={interaction.isSelected}
            selectionEdges={interaction.selectionEdges}
            isDropTarget={interaction.isDropTarget}
            isBlockDragging={interaction.isBlockDragging}
            canGrab={interaction.canGrab}
            onSaveProcess={(processTypeId, hours) =>
              grid.saveProcessCell(gridRow, processTypeId, date, hours)
            }
            onSaveDefault={(hours) => grid.saveDefaultCell(gridRow, col, hours)}
            onPointerDown={interaction.onPointerDown}
            onCancelBlockDrag={interaction.onCancelBlockDrag}
            onGridKeyDown={interaction.onGridKeyDown}
            onClear={interaction.onClear}
            onCommitNavigate={interaction.onCommitNavigate}
            onCommitNavigateTab={interaction.onCommitNavigateTab}
            setCellRef={interaction.setCellRef}
          />
        );
      })}
    </tr>
  );
}
