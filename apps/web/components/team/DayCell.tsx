"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildSelectionEdgeShadow,
  isArrowKey,
  type SelectionEdges,
} from "@/lib/schedule-grid-selection";
import {
  type ScheduleTableSize,
  SCHEDULE_GRID_BORDER,
} from "@/lib/schedule-table-size";

type Props = {
  date: string;
  row: number;
  col: number;
  hours: number;
  rowBg?: string;
  size?: ScheduleTableSize;
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
  readOnly?: boolean;
  onSave: (hours: number) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLTableCellElement>) => void;
  onCancelBlockDrag?: () => void;
  onGridKeyDown?: (key: string, shiftKey: boolean) => void;
  onClear?: () => void;
  onCommitNavigate?: () => void;
  onCommitNavigateTab?: (reverse: boolean) => void;
  onShiftEnter?: () => void;
  setCellRef?: (el: HTMLTableCellElement | null) => void;
};

function parseHours(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function DayCell({
  date,
  row,
  col,
  hours,
  rowBg,
  size = "normal",
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
  readOnly = false,
  onSave,
  onPointerDown,
  onCancelBlockDrag,
  onGridKeyDown,
  onClear,
  onCommitNavigate,
  onCommitNavigateTab,
  onShiftEnter,
  setCellRef,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function cancelEditing() {
    setEditing(false);
    setValue("");
  }

  function commit() {
    const parsed = parseHours(value);
    if (parsed === null) {
      cancelEditing();
      return false;
    }
    setEditing(false);
    setValue("");
    onSave(parsed);
    return true;
  }

  function startEditing(initial = "") {
    setEditing(true);
    setValue(
      initial ||
        (hours > 0 ? String(Math.round(hours)) : ""),
    );
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    });
  }

  function handleCellPointerDown(e: React.PointerEvent<HTMLTableCellElement>) {
    if (editing) return;
    if (e.button !== 0) return;
    onPointerDown?.(e);
  }

  function handleCellDoubleClick() {
    if (readOnly || editing) return;
    onCancelBlockDrag?.();
    startEditing();
  }

  function handleCellKeyDown(e: React.KeyboardEvent<HTMLTableCellElement>) {
    if (readOnly || editing) return;

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
      if (e.key === "Enter" && e.shiftKey) {
        onShiftEnter?.();
        return;
      }
      startEditing();
      return;
    }

    if (/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      startEditing(e.key);
    }
  }

  const dayStyles =
    size === "expanded"
      ? { cell: "h-9 text-sm", input: "text-sm" }
      : { cell: "h-7 text-[11px]", input: "text-[11px]" };

  const widthStyle =
    dayCellWidth != null
      ? {
          width: dayCellWidth,
          minWidth: dayCellWidth,
          maxWidth: dayCellWidth,
        }
      : undefined;

  const defaultMinClass =
    dayCellWidth == null
      ? size === "expanded"
        ? "min-w-[52px]"
        : "min-w-[36px]"
      : "";

  const isMonthStart = Number(date.slice(8)) === 1;

  const showSelectionOutline =
    isSelected && !isActive && !editing && !isDropTarget && selectionEdges;
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

  return (
    <td
      ref={setCellRef}
      data-date={date}
      data-schedule-cell=""
      data-schedule-row={row}
      data-schedule-col={col}
      style={cellStyle}
      className={cn(
        "relative",
        SCHEDULE_GRID_BORDER,
        "text-center outline-none touch-none",
        dayStyles.cell,
        defaultMinClass,
        !isHoliday && rowBg,
        isHoliday && !isSelected && "bg-bg text-muted",
        isHoliday && isSelected && "bg-primary/15 text-muted",
        isToday && !isSelected && "ring-1 ring-inset ring-amber-300/60",
        !isHoliday && isSelected && "bg-primary/15",
        isActive &&
          !editing &&
          !isDropTarget &&
          "ring-2 ring-inset ring-primary/60",
        isDropTarget && "bg-primary/20 ring-2 ring-inset ring-primary",
        isBlockDragging && "opacity-50",
        editing && "p-0 ring-2 ring-inset ring-primary/50",
        showMonthDividers && isMonthStart && "border-l-2 border-l-border",
        canGrab && !editing && !readOnly && "cursor-grab",
        !canGrab && !editing && !readOnly && "cursor-cell hover:bg-primary/5",
        readOnly && "cursor-default",
      )}
      tabIndex={readOnly ? -1 : isActive ? 0 : -1}
      onPointerDown={readOnly ? undefined : handleCellPointerDown}
      onDoubleClick={readOnly ? undefined : handleCellDoubleClick}
      onKeyDown={readOnly ? undefined : handleCellKeyDown}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-label={`${date} の実績時間`}
          className={cn(
            "absolute inset-0 h-full w-full select-text border-0 bg-white/90 px-0.5 text-center tabular-nums outline-none",
            dayStyles.input,
          )}
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
              if (commit()) {
                onCommitNavigate?.();
              }
            }
            if (e.key === "Tab") {
              e.preventDefault();
              if (commit()) {
                onCommitNavigateTab?.(e.shiftKey);
              }
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancelEditing();
            }
            if (isArrowKey(e.key)) {
              e.preventDefault();
              if (commit()) {
                onGridKeyDown?.(e.key, e.shiftKey);
              }
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="pointer-events-none block truncate px-0.5 tabular-nums leading-[inherit]">
          {hours > 0 ? Math.round(hours) : ""}
        </span>
      )}
    </td>
  );
}
