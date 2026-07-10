"use client";

import { Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { TeamScheduleProjectDto } from "@logivoice/shared";
import { PROJECT_STATUS_LABELS } from "@logivoice/shared";
import {
  getDayPlannedProcessSegments,
  getDayProcessSegments,
} from "@/lib/project-schedule-summary";
import type { useTeamSummaryGrid } from "@/hooks/useTeamSummaryGrid";
import { cn } from "@/lib/utils";
import {
  getScheduleTableStyles,
  SCHEDULE_GRID_BORDER,
  SCHEDULE_ROW_BORDER_ACTUAL,
  SCHEDULE_ROW_BORDER_PLANNED,
  SCHEDULE_STICKY_DIVIDER,
} from "@/lib/schedule-table-size";
import { SummaryInteractiveDayCell } from "./SummaryInteractiveDayCell";
import { SummaryRowKindCell } from "./SummaryRowKindCell";

type GridApi = ReturnType<typeof useTeamSummaryGrid>;

type Props = {
  project: TeamScheduleProjectDto;
  dates: string[];
  holidays: Record<string, boolean>;
  today?: string;
  dayCellWidth?: number;
  showMonthHeaders?: boolean;
  isExpanded: boolean;
  gridProjectIndex: number;
  grid: GridApi;
  onToggle: () => void;
};

function ProjectInfo({
  project,
  isExpanded,
  onToggle,
}: {
  project: TeamScheduleProjectDto;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-start gap-1.5"
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
  );
}

export function ProjectSummaryRow({
  project,
  dates,
  holidays,
  today,
  dayCellWidth,
  showMonthHeaders = false,
  isExpanded,
  gridProjectIndex,
  grid,
  onToggle,
}: Props) {
  const styles = getScheduleTableStyles("normal");
  const plannedGridRow = gridProjectIndex * 2;
  const actualGridRow = gridProjectIndex * 2 + 1;

  const metricCells = (
    <>
      <td
        rowSpan={2}
        className={cn(
          "text-center align-middle",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          "bg-white",
          isExpanded && "bg-primary/5",
        )}
      >
        {project.plannedHours}
      </td>
      <td
        rowSpan={2}
        className={cn(
          "text-center align-middle",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          "bg-white",
          isExpanded && "bg-primary/5",
        )}
      >
        {project.totalActualHours}
      </td>
      <td
        rowSpan={2}
        className={cn(
          "text-center align-middle",
          styles.metricCell,
          SCHEDULE_GRID_BORDER,
          "bg-white",
          isExpanded && "bg-primary/5",
        )}
      >
        {project.totalProgressRate}%
      </td>
    </>
  );

  const rows: Array<{
    gridRow: number;
    recordType: "planned" | "actual";
    rowLabel: string;
    rowBorder: string;
    getSegments: (date: string) => ReturnType<typeof getDayProcessSegments>;
  }> = [
    {
      gridRow: plannedGridRow,
      recordType: "planned",
      rowLabel: "予定",
      rowBorder: SCHEDULE_ROW_BORDER_PLANNED,
      getSegments: (date) => getDayPlannedProcessSegments(project, date),
    },
    {
      gridRow: actualGridRow,
      recordType: "actual",
      rowLabel: "実績",
      rowBorder: SCHEDULE_ROW_BORDER_ACTUAL,
      getSegments: (date) => getDayProcessSegments(project, date),
    },
  ];

  return (
    <>
      {rows.map((rowDef, rowIndex) => (
        <tr
          key={rowDef.recordType}
          className={cn(
            "transition-colors",
            rowDef.rowBorder,
            isExpanded && "bg-primary/5",
          )}
        >
          {rowIndex === 0 && (
            <>
              <td
                rowSpan={2}
                className={cn(
                  "sticky left-0 z-10 cursor-pointer bg-white transition-colors hover:bg-primary/5",
                  styles.processSticky,
                  SCHEDULE_STICKY_DIVIDER,
                  isExpanded && "bg-primary/5",
                )}
              >
                <ProjectInfo
                  project={project}
                  isExpanded={isExpanded}
                  onToggle={onToggle}
                />
              </td>
              <Fragment key="metrics">{metricCells}</Fragment>
            </>
          )}
          <SummaryRowKindCell
            label={rowDef.rowLabel}
            className={cn(
              "bg-white",
              isExpanded && "bg-primary/5",
            )}
          />
          {dates.map((date, col) => {
            const interaction = grid.getCellInteraction(rowDef.gridRow, col);
            return (
              <SummaryInteractiveDayCell
                key={date}
                date={date}
                row={interaction.row}
                col={interaction.col}
                recordType={rowDef.recordType}
                rowLabel={rowDef.rowLabel}
                segments={rowDef.getSegments(date)}
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
                  grid.saveProcessCell(
                    rowDef.gridRow,
                    processTypeId,
                    date,
                    hours,
                    rowDef.recordType,
                  )
                }
                onSaveDefault={(hours) =>
                  grid.saveDefaultCell(rowDef.gridRow, col, hours)
                }
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
      ))}
    </>
  );
}
