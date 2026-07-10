"use client";

import { useRef, useState } from "react";
import type { DayProcessSegment } from "@/lib/project-schedule-summary";
import { getProcessRowColors, formatProcessAbbrev } from "@/lib/process-colors";
import {
  buildSelectionEdgeShadow,
  isArrowKey,
  type SelectionEdges,
} from "@/lib/schedule-grid-selection";
import { cn } from "@/lib/utils";
import {
  SCHEDULE_GRID_BORDER,
} from "@/lib/schedule-table-size";

type Props = {
  date: string;
  row: number;
  col: number;
  recordType: "planned" | "actual";
  rowLabel: string;
  segments: DayProcessSegment[];
  dayCellWidth?: number;
  showMonthDividers?: boolean;
  isHoliday: boolean;
  isToday?: boolean;
  isActive?: boolean;
  isSelected?: boolean;
  selectionEdges?: SelectionEdges;
  isDropTarget?: boolean;
  isBlockDragging?: boolean;
  canGrab?: boolean;
  onSaveProcess: (processTypeId: string, hours: number) => void;
  onSaveDefault: (hours: number) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLTableCellElement>) => void;
  onCancelBlockDrag?: () => void;
  onGridKeyDown?: (key: string, shiftKey: boolean) => void;
  onClear?: () => void;
  onCommitNavigate?: () => void;
  onCommitNavigateTab?: (reverse: boolean) => void;
  setCellRef?: (el: HTMLTableCellElement | null) => void;
};

function parseHours(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatSegmentDisplayHours(
  hours: number,
  recordType: "planned" | "actual",
): string | number {
  if (hours <= 0) return "";
  return recordType === "planned" ? Math.round(hours) : hours;
}

function VerticalSegmentLabel({
  processTypeName,
  hours,
  recordType,
}: {
  processTypeName: string;
  hours: number;
  recordType: "planned" | "actual";
}) {
  const displayHours = formatSegmentDisplayHours(hours, recordType);
  if (displayHours === "") return null;
  const chars = [...formatProcessAbbrev(processTypeName)];

  return (
    <div className="flex flex-col items-center justify-center leading-none">
      {chars.map((char, index) => (
        <span key={`${char}-${index}`} className="text-[8px]">
          {char}
        </span>
      ))}
      <span className="text-[9px] tabular-nums">{displayHours}</span>
    </div>
  );
}

export function SummaryInteractiveDayCell({
  date,
  row,
  col,
  recordType,
  rowLabel,
  segments,
  dayCellWidth,
  showMonthDividers = false,
  isHoliday,
  isToday = false,
  isActive = false,
  isSelected = false,
  selectionEdges,
  isDropTarget = false,
  isBlockDragging = false,
  canGrab = false,
  onSaveProcess,
  onSaveDefault,
  onPointerDown,
  onCancelBlockDrag,
  onGridKeyDown,
  onClear,
  onCommitNavigate,
  onCommitNavigateTab,
  setCellRef,
}: Props) {
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingProcessId !== null;
  const total = segments.reduce((sum, s) => sum + s.hours, 0);
  const day = Number(date.slice(8));
  const isMonthStart = day === 1;

  const widthStyle =
    dayCellWidth != null
      ? { width: dayCellWidth, minWidth: dayCellWidth, maxWidth: dayCellWidth }
      : undefined;

  const showSelectionOutline =
    isSelected && !isActive && !isEditing && !isDropTarget && selectionEdges;
  const selectionShadow = showSelectionOutline
    ? buildSelectionEdgeShadow(selectionEdges)
    : undefined;
  const cellStyle =
    widthStyle || selectionShadow
      ? {
          ...widthStyle,
          ...(selectionShadow ? { boxShadow: selectionShadow } : {}),
        }
      : undefined;

  const visibleSegments = segments.filter(
    (seg) => formatSegmentDisplayHours(seg.hours, recordType) !== "",
  );
  const singleSegment =
    visibleSegments.length === 1 ? visibleSegments[0]! : null;
  const singleColors = singleSegment
    ? getProcessRowColors(singleSegment.processTypeName)
    : null;
  const hasSegmentData = visibleSegments.length > 0;
  const useSingleCellFill =
    hasSegmentData &&
    singleSegment != null &&
    !isEditing &&
    !isHoliday &&
    !isSelected &&
    !isActive &&
    !isDropTarget;

  function cancelEditing() {
    setEditingProcessId(null);
    setValue("");
  }

  function commit(): boolean {
    if (!editingProcessId) return false;
    const parsed = parseHours(value);
    if (parsed === null) {
      cancelEditing();
      return false;
    }
    setEditingProcessId(null);
    setValue("");
    if (editingProcessId === "__default__") {
      onSaveDefault(parsed);
    } else {
      onSaveProcess(editingProcessId, parsed);
    }
    return true;
  }

  function startEditing(processTypeId: string, initialHours?: number) {
    onCancelBlockDrag?.();
    setEditingProcessId(processTypeId);
    setValue(
      initialHours != null && initialHours > 0
        ? String(Math.round(initialHours))
        : "",
    );
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    });
  }

  function handleCellPointerDown(e: React.PointerEvent<HTMLTableCellElement>) {
    if (isEditing) return;
    if (e.button !== 0) return;
    onPointerDown?.(e);
  }

  function handleCellDoubleClick(e: React.MouseEvent<HTMLTableCellElement>) {
    if (isEditing) return;
    e.stopPropagation();
    onCancelBlockDrag?.();
    if (segments.length === 1) {
      startEditing(segments[0]!.processTypeId, segments[0]!.hours);
      return;
    }
    if (segments.length === 0) {
      startEditing("__default__");
    }
  }

  function handleSegmentDoubleClick(
    e: React.MouseEvent,
    processTypeId: string,
    hours: number,
  ) {
    e.stopPropagation();
    if (isEditing) return;
    startEditing(processTypeId, hours);
  }

  function handleCellKeyDown(e: React.KeyboardEvent<HTMLTableCellElement>) {
    if (isEditing) return;

    if (isArrowKey(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      onGridKeyDown?.(e.key, e.shiftKey);
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      onClear?.();
      return;
    }

    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      e.stopPropagation();
      if (segments.length === 1) {
        startEditing(segments[0]!.processTypeId, segments[0]!.hours);
      } else if (segments.length === 0) {
        startEditing("__default__");
      } else {
        startEditing(segments[0]!.processTypeId, segments[0]!.hours);
      }
      return;
    }

    if (/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      if (segments.length === 1) {
        startEditing(segments[0]!.processTypeId);
        setValue(e.key);
      } else {
        startEditing("__default__");
        setValue(e.key);
      }
    }
  }

  return (
    <td
      ref={setCellRef}
      data-date={date}
      data-summary-grid-cell=""
      data-summary-row={row}
      data-summary-col={col}
      style={cellStyle}
      className={cn(
        "relative p-0 align-middle outline-none touch-none",
        SCHEDULE_GRID_BORDER,
        "min-h-7 text-[11px] text-center",
        dayCellWidth == null && "min-w-[36px]",
        useSingleCellFill && singleColors?.cell,
        useSingleCellFill && singleColors?.label,
        !useSingleCellFill &&
          isHoliday &&
          !isSelected &&
          recordType === "planned" &&
          "bg-bg/40",
        !useSingleCellFill &&
          isHoliday &&
          !isSelected &&
          recordType === "actual" &&
          "bg-bg/60",
        isHoliday && isSelected && "bg-primary/15",
        isToday && !isSelected && !isDropTarget && "ring-1 ring-inset ring-amber-300/60",
        !useSingleCellFill && !isHoliday && isSelected && "bg-primary/15",
        isActive &&
          !isEditing &&
          !isDropTarget &&
          "ring-2 ring-inset ring-primary/60",
        isDropTarget && "bg-primary/20 ring-2 ring-inset ring-primary",
        isBlockDragging && "opacity-50",
        isEditing && "ring-2 ring-inset ring-primary/50",
        showMonthDividers && isMonthStart && "border-l-2 border-l-border",
        canGrab && !isEditing && "cursor-grab",
        !canGrab &&
          !isEditing &&
          hasSegmentData &&
          "cursor-cell",
        !canGrab &&
          !isEditing &&
          !hasSegmentData &&
          "cursor-cell hover:bg-primary/5",
      )}
      tabIndex={isActive ? 0 : -1}
      title={
        segments.length > 0
          ? segments
              .map(
                (s) =>
                  `${s.processTypeName}: ${formatSegmentDisplayHours(s.hours, recordType) || 0}h`,
              )
              .join(" / ")
          : undefined
      }
      onPointerDown={handleCellPointerDown}
      onDoubleClick={handleCellDoubleClick}
      onKeyDown={handleCellKeyDown}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-label={`${date} の${rowLabel}時間`}
          className="absolute inset-0 h-full w-full select-text border-0 bg-white/95 px-0.5 text-center text-[11px] tabular-nums outline-none"
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "" || /^[0-9]*\.?[0-9]*$/.test(next)) {
              setValue(next);
            }
          }}
          onBlur={() => {
            commit();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              if (commit()) onCommitNavigate?.();
            }
            if (e.key === "Tab") {
              e.preventDefault();
              if (commit()) onCommitNavigateTab?.(e.shiftKey);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancelEditing();
            }
            if (isArrowKey(e.key)) {
              e.preventDefault();
              if (commit()) onGridKeyDown?.(e.key, e.shiftKey);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : segments.length === 0 ? (
        <span className="block min-h-[22px]" />
      ) : visibleSegments.length === 1 ? (
        <VerticalSegmentLabel
          processTypeName={visibleSegments[0]!.processTypeName}
          hours={visibleSegments[0]!.hours}
          recordType={recordType}
        />
      ) : (
        <div className="absolute inset-0 flex min-h-[22px] flex-row items-stretch">
          {visibleSegments.map((seg) => {
            const colors = getProcessRowColors(seg.processTypeName);
            return (
              <div
                key={seg.processTypeId}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center",
                  !isHoliday && !isSelected && colors.cell,
                  !isHoliday && !isSelected && colors.label,
                  isHoliday && "bg-bg/50 text-muted",
                )}
                onDoubleClick={(e) =>
                  handleSegmentDoubleClick(e, seg.processTypeId, seg.hours)
                }
              >
                <VerticalSegmentLabel
                  processTypeName={seg.processTypeName}
                  hours={seg.hours}
                  recordType={recordType}
                />
              </div>
            );
          })}
        </div>
      )}
      {segments.length > 1 && total > 0 && (
        <span className="sr-only">{total}h</span>
      )}
    </td>
  );
}
