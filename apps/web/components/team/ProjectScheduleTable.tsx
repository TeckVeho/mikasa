"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { TeamScheduleProjectDto } from "@logivoice/shared";
import {
  getProcessRowColors,
  PROCESS_SECTION_COLORS,
} from "@/lib/process-colors";
import {
  getScheduleTableStyles,
  SCHEDULE_GRID_BORDER,
  SCHEDULE_ROW_BORDER_ACTUAL,
  SCHEDULE_ROW_BORDER_PLANNED,
  SCHEDULE_STICKY_DIVIDER,
  type ScheduleTableSize,
} from "@/lib/schedule-table-size";
import {
  buildBlockDragPayload,
  buildClipboardFromSelection,
  clipboardToTsv,
  computeBlockMoveUpdates,
  computeClearSelectionUpdates,
  computeFillDownUpdates,
  computeFillRightUpdates,
  computePasteUpdates,
  parseTsvToClipboard,
  type BlockDragPayload,
  type ScheduleCellUpdate,
  type ScheduleClipboard,
} from "@/lib/schedule-grid-clipboard";
import {
  type GridCell,
  isArrowKey,
  isCellInSelection,
  moveGridCell,
} from "@/lib/schedule-grid-selection";
import {
  jumpToDataEdge,
  jumpToRowEdge,
  jumpToSheetCorner,
  navigateTab,
  selectAllCells,
} from "@/lib/schedule-grid-navigation";
import { findScheduleCellFromPoint } from "@/lib/schedule-grid-pointer";
import { groupDatesByMonth } from "@/lib/schedule-display";
import { cn } from "@/lib/utils";
import { DayCell } from "./DayCell";

const BLOCK_DRAG_THRESHOLD = 5;

type Props = {
  project: TeamScheduleProjectDto;
  dates: string[];
  holidays: Record<string, boolean>;
  today?: string;
  size: ScheduleTableSize;
  dayCellWidth?: number;
  showMonthHeaders?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onSaveCell: (
    projectId: string,
    processTypeId: string,
    date: string,
    hours: number,
    recordType?: "planned" | "actual",
  ) => void;
  onBulkSave: (
    projectId: string,
    updates: ScheduleCellUpdate[],
  ) => Promise<boolean>;
};

export function ProjectScheduleTable({
  project,
  dates,
  holidays,
  today,
  size,
  dayCellWidth,
  showMonthHeaders = false,
  scrollRef,
  onSaveCell,
  onBulkSave,
}: Props) {
  const styles = getScheduleTableStyles(size);
  const monthGroups = showMonthHeaders ? groupDatesByMonth(dates) : [];
  const dayWidthStyle =
    dayCellWidth != null
      ? { width: dayCellWidth, minWidth: dayCellWidth, maxWidth: dayCellWidth }
      : undefined;
  const colCount = dates.length;
  const rowCount = project.processes.length * 2;
  const bounds = { rowCount, colCount };

  function processIndexFromRow(row: number) {
    return Math.floor(row / 2);
  }

  function isPlannedRow(row: number) {
    return row % 2 === 0;
  }

  const [focus, setFocus] = useState<GridCell | null>(null);
  const [anchor, setAnchor] = useState<GridCell | null>(null);
  const [isBlockDragging, setIsBlockDragging] = useState(false);
  const [dropPreview, setDropPreview] = useState<GridCell | null>(null);

  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const clipboardRef = useRef<ScheduleClipboard | null>(null);
  const tableRootRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<{ anchor: GridCell | null; focus: GridCell | null }>({
    anchor: null,
    focus: null,
  });
  const rangeSelectRef = useRef(false);
  const blockDragRef = useRef<{
    payload: BlockDragPayload;
    startX: number;
    startY: number;
    active: boolean;
    dropCell: GridCell | null;
  } | null>(null);
  const blockDragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    selectionRef.current = { anchor, focus };
  }, [anchor, focus]);

  useEffect(() => {
    return () => {
      blockDragCleanupRef.current?.();
    };
  }, []);

  const getHours = useCallback(
    (row: number, col: number) => {
      const proc = project.processes[processIndexFromRow(row)];
      const date = dates[col];
      if (!proc || !date) return 0;
      return isPlannedRow(row)
        ? proc.plannedDailyHours[date] ?? 0
        : proc.actualDailyHours[date] ?? proc.dailyHours[date] ?? 0;
    },
    [project.processes, dates],
  );

  const resolveCell = useCallback(
    (row: number, col: number) => ({
      processTypeId: project.processes[processIndexFromRow(row)]!.processTypeId,
      date: dates[col]!,
      recordType: isPlannedRow(row) ? ("planned" as const) : ("actual" as const),
    }),
    [project.processes, dates],
  );

  const registerCellRef = useCallback((row: number, col: number, el: HTMLTableCellElement | null) => {
    const key = `${row}-${col}`;
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const focusCellElement = useCallback((cell: GridCell) => {
    const el = cellRefs.current.get(`${cell.row}-${cell.col}`);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  useEffect(() => {
    if (!focus) return;
    focusCellElement(focus);
  }, [focus, focusCellElement]);

  const applySelection = useCallback(
    (nextAnchor: GridCell, nextFocus: GridCell) => {
      selectionRef.current = { anchor: nextAnchor, focus: nextFocus };
      flushSync(() => {
        setAnchor(nextAnchor);
        setFocus(nextFocus);
      });
      focusCellElement(nextFocus);
    },
    [focusCellElement],
  );

  const selectionHasDataAt = useCallback(
    (a: GridCell | null, f: GridCell | null) => {
      if (!a || !f) return false;
      return (
        buildBlockDragPayload(project.projectId, a, f, (row, col) => {
          const { processTypeId, date } = resolveCell(row, col);
          return { processTypeId, date, hours: getHours(row, col) };
        }) !== null
      );
    },
    [getHours, project.projectId, resolveCell],
  );

  const stopRangeSelect = useCallback(() => {
    rangeSelectRef.current = false;
  }, []);

  const stopBlockDrag = useCallback(() => {
    blockDragCleanupRef.current?.();
    blockDragCleanupRef.current = null;
    blockDragRef.current = null;
    setIsBlockDragging(false);
    setDropPreview(null);
  }, []);

  const executeBlockMove = useCallback(
    async (payload: BlockDragPayload, dropCell: GridCell) => {
      const result = computeBlockMoveUpdates(
        payload,
        dropCell.row,
        dropCell.col,
        bounds,
        resolveCell,
      );
      if (!result.ok) return;

      const ok = await onBulkSave(project.projectId, result.updates);
      if (!ok) return;

      const dRow = dropCell.row - payload.originRow;
      const dCol = dropCell.col - payload.originCol;
      const { anchor: a, focus: f } = selectionRef.current;
      if (a && f) {
        applySelection(
          { row: a.row + dRow, col: a.col + dCol },
          { row: f.row + dRow, col: f.col + dCol },
        );
      } else {
        applySelection(dropCell, dropCell);
      }
    },
    [applySelection, bounds, onBulkSave, project.projectId, resolveCell],
  );

  const startBlockDrag = useCallback(
    (
      originRow: number,
      originCol: number,
      selAnchor: GridCell,
      selFocus: GridCell,
      startX: number,
      startY: number,
    ) => {
      const payload = buildBlockDragPayload(
        project.projectId,
        selAnchor,
        selFocus,
        (row, col) => {
          const { processTypeId, date } = resolveCell(row, col);
          return { processTypeId, date, hours: getHours(row, col) };
        },
      );
      if (!payload) return;

      stopBlockDrag();
      blockDragRef.current = {
        payload: { ...payload, originRow, originCol },
        startX,
        startY,
        active: false,
        dropCell: null,
      };

      function onPointerMove(e: PointerEvent) {
        const drag = blockDragRef.current;
        if (!drag) return;

        const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
        if (!drag.active) {
          if (dist < BLOCK_DRAG_THRESHOLD) return;
          drag.active = true;
          setIsBlockDragging(true);
        }

        const cell = findScheduleCellFromPoint(e.clientX, e.clientY);
        drag.dropCell = cell;
        setDropPreview(cell);
      }

      function onPointerUp() {
        const drag = blockDragRef.current;
        stopBlockDrag();

        if (drag?.active && drag.dropCell) {
          void executeBlockMove(drag.payload, drag.dropCell);
        }
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      blockDragCleanupRef.current = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };
    },
    [executeBlockMove, getHours, project.projectId, resolveCell, stopBlockDrag],
  );

  const startRangeSelect = useCallback(() => {
    rangeSelectRef.current = true;

    function onPointerMove(e: PointerEvent) {
      if (!rangeSelectRef.current) return;
      const cell = findScheduleCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      const { anchor: a } = selectionRef.current;
      if (!a) return;
      if (
        selectionRef.current.focus?.row === cell.row &&
        selectionRef.current.focus?.col === cell.col
      ) {
        return;
      }
      selectionRef.current = { anchor: a, focus: cell };
      setFocus(cell);
    }

    function onPointerUp() {
      stopRangeSelect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }, [stopRangeSelect]);

  const handleCellPointerDown = useCallback(
    (row: number, col: number, e: React.PointerEvent) => {
      if (e.button !== 0) return;

      stopBlockDrag();

      const { anchor: prevAnchor, focus: prevFocus } = selectionRef.current;
      const wasInSelection = isCellInSelection(row, col, prevAnchor, prevFocus);
      const shift = e.shiftKey;
      const cellHasData = getHours(row, col) > 0;
      const multiHasData = selectionHasDataAt(prevAnchor, prevFocus);

      let nextAnchor: GridCell;
      let nextFocus: GridCell;
      let useRangeSelect = false;

      if (shift) {
        nextAnchor = prevAnchor ?? prevFocus ?? { row, col };
        nextFocus = { row, col };
        useRangeSelect = true;
      } else if (wasInSelection && multiHasData) {
        nextAnchor = prevAnchor!;
        nextFocus = { row, col };
      } else {
        nextAnchor = { row, col };
        nextFocus = { row, col };
        useRangeSelect = !cellHasData;
      }

      applySelection(nextAnchor, nextFocus);

      if (useRangeSelect) {
        startRangeSelect();
      } else {
        stopRangeSelect();
        if (selectionHasDataAt(nextAnchor, nextFocus)) {
          startBlockDrag(row, col, nextAnchor, nextFocus, e.clientX, e.clientY);
        }
      }
    },
    [
      applySelection,
      getHours,
      selectionHasDataAt,
      startBlockDrag,
      startRangeSelect,
      stopBlockDrag,
      stopRangeSelect,
    ],
  );

  const handleGridKeyDown = useCallback(
    (key: string, shiftKey: boolean, row: number, col: number) => {
      if (!isArrowKey(key)) return;

      const current = focus ?? { row, col };
      const next = moveGridCell(current, key, bounds);

      if (shiftKey) {
        setFocus(next);
        setAnchor((prev) => prev ?? current);
      } else {
        setFocus(next);
        setAnchor(next);
      }
    },
    [bounds, focus],
  );

  const applyFocus = useCallback((next: GridCell, extend: boolean) => {
    setFocus(next);
    if (extend) {
      setAnchor((prev) => prev ?? focus ?? next);
    } else {
      setAnchor(next);
    }
  }, [focus]);

  const handleCommitNavigateTab = useCallback(
    (reverse: boolean) => {
      if (!focus) return;
      const next = navigateTab(focus, bounds, reverse);
      setFocus(next);
      setAnchor(next);
    },
    [bounds, focus],
  );

  const handleShiftEnter = useCallback(() => {
    if (!focus) return;
    const next = moveGridCell(focus, "ArrowUp", bounds);
    setFocus(next);
    setAnchor(next);
  }, [bounds, focus]);

  const handleCommitNavigate = useCallback(() => {
    if (!focus) return;
    const next = moveGridCell(focus, "ArrowDown", bounds);
    setFocus(next);
    setAnchor(next);
  }, [bounds, focus]);

  const selectionHasData =
    anchor && focus ? selectionHasDataAt(anchor, focus) : false;

  const handleDelete = useCallback(async () => {
    if (!anchor || !focus) return;
    const updates = computeClearSelectionUpdates(anchor, focus, resolveCell, getHours);
    if (updates.length === 0) return;
    await onBulkSave(project.projectId, updates);
  }, [anchor, focus, getHours, onBulkSave, project.projectId, resolveCell]);

  const handleCopy = useCallback(async () => {
    if (!anchor || !focus) return;
    const clip = buildClipboardFromSelection(anchor, focus, getHours);
    clipboardRef.current = clip;
    const tsv = clipboardToTsv(clip);
    try {
      await navigator.clipboard.writeText(tsv);
    } catch {
      // クリップボード書き込み不可時もアプリ内コピーは有効
    }
  }, [anchor, focus, getHours]);

  const handleCut = useCallback(async () => {
    await handleCopy();
    await handleDelete();
  }, [handleCopy, handleDelete]);

  const handleFillDown = useCallback(async () => {
    if (!anchor || !focus) return;
    const updates = computeFillDownUpdates(anchor, focus, getHours, resolveCell);
    if (updates.length === 0) return;
    await onBulkSave(project.projectId, updates);
  }, [anchor, focus, getHours, onBulkSave, project.projectId, resolveCell]);

  const handleFillRight = useCallback(async () => {
    if (!anchor || !focus) return;
    const updates = computeFillRightUpdates(anchor, focus, getHours, resolveCell);
    if (updates.length === 0) return;
    await onBulkSave(project.projectId, updates);
  }, [anchor, focus, getHours, onBulkSave, project.projectId, resolveCell]);

  const handleSelectAll = useCallback(() => {
    const { anchor: a, focus: f } = selectAllCells(bounds);
    setAnchor(a);
    setFocus(f);
  }, [bounds]);

  const hasData = useCallback(
    (row: number, col: number) => getHours(row, col) > 0,
    [getHours],
  );

  const handlePaste = useCallback(async () => {
    if (!focus) return;

    let clip = clipboardRef.current;
    if (!clip) {
      try {
        const text = await navigator.clipboard.readText();
        clip = parseTsvToClipboard(text);
      } catch {
        return;
      }
    }
    if (!clip) return;

    const result = computePasteUpdates(
      clip,
      focus.row,
      focus.col,
      bounds,
      holidays,
      resolveCell,
    );
    if (!result.ok) return;

    const ok = await onBulkSave(project.projectId, result.updates);
    if (ok) {
      const endRow = Math.min(focus.row + clip.rows - 1, rowCount - 1);
      const endCol = Math.min(focus.col + clip.cols - 1, colCount - 1);
      setAnchor({ row: focus.row, col: focus.col });
      setFocus({ row: endRow, col: endCol });
    }
  }, [
    bounds,
    colCount,
    focus,
    holidays,
    onBulkSave,
    project.projectId,
    resolveCell,
    rowCount,
  ]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const root = tableRootRef.current;
      if (!root?.contains(document.activeElement)) return;

      const isEditing = document.activeElement?.tagName === "INPUT";
      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;

      if (mod) {
        const key = e.key.toLowerCase();
        if (key === "c") {
          e.preventDefault();
          void handleCopy();
          return;
        }
        if (key === "x") {
          e.preventDefault();
          void handleCut();
          return;
        }
        if (key === "v") {
          e.preventDefault();
          void handlePaste();
          return;
        }
        if (key === "a") {
          e.preventDefault();
          handleSelectAll();
          return;
        }
        if (key === "d") {
          e.preventDefault();
          void handleFillDown();
          return;
        }
        if (key === "r") {
          e.preventDefault();
          void handleFillRight();
          return;
        }
        if (isArrowKey(e.key) && focus && !isEditing) {
          e.preventDefault();
          const next = jumpToDataEdge(focus, e.key, bounds, hasData);
          applyFocus(next, shift);
          return;
        }
        if (e.key === "Home" && !isEditing) {
          e.preventDefault();
          applyFocus(jumpToSheetCorner(bounds, false), shift);
          return;
        }
        if (e.key === "End" && !isEditing) {
          e.preventDefault();
          applyFocus(jumpToSheetCorner(bounds, true), shift);
          return;
        }
      }

      if (isEditing) return;

      if (!focus) {
        if (e.key === "Tab" || isArrowKey(e.key) || e.key === "Home" || e.key === "End") {
          const initial = selectAllCells(bounds);
          setAnchor(initial.anchor);
          setFocus(initial.focus);
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        void handleDelete();
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        applyFocus(navigateTab(focus, bounds, shift), false);
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        applyFocus(jumpToRowEdge(focus, bounds, true), shift);
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        applyFocus(jumpToRowEdge(focus, bounds, false), shift);
        return;
      }

      if (isArrowKey(e.key)) {
        e.preventDefault();
        const next = moveGridCell(focus, e.key, bounds);
        applyFocus(next, shift);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    applyFocus,
    bounds,
    focus,
    handleCopy,
    handleCut,
    handleDelete,
    handleFillDown,
    handleFillRight,
    handlePaste,
    handleSelectAll,
    hasData,
  ]);

  return (
    <div
      ref={(el) => {
        tableRootRef.current = el;
        if (scrollRef && "current" in scrollRef) {
          (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
      }}
      className="team-schedule-scroll overflow-x-auto"
    >
      <table
        className={cn(styles.table, "select-none border-collapse")}
        style={
          dayCellWidth != null
            ? { minWidth: 268 + dayCellWidth * dates.length }
            : undefined
        }
      >
        <thead>
          {showMonthHeaders && monthGroups.length > 1 && (
            <tr className={cn("border-b border-border/60 bg-bg text-muted", styles.thead)}>
              <th
                colSpan={4}
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
            <th className={cn("sticky left-0 z-10 bg-bg text-left", styles.processSticky, SCHEDULE_STICKY_DIVIDER)}>
              工程
            </th>
            <th className={cn(styles.metricCell, SCHEDULE_GRID_BORDER)}>目標h</th>
            <th className={cn(styles.metricCell, SCHEDULE_GRID_BORDER)}>実績h</th>
            <th className={cn(styles.metricCell, SCHEDULE_GRID_BORDER)}>比率%</th>
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
                  {isToday ? `今日 ${day}` : day}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {project.processes.flatMap((proc, processIndex) => {
            const colors = getProcessRowColors(proc.processTypeName);
            const plannedRowIndex = processIndex * 2;
            const actualRowIndex = processIndex * 2 + 1;

            const renderRow = (
              rowIndex: number,
              label: string,
              rowKind: "planned" | "actual",
              options?: { metrics?: React.ReactNode; skipMetrics?: boolean },
            ) => {
              const rowCellBg =
                rowKind === "planned" ? colors.plannedCell : colors.cell;
              const rowStickyBg =
                rowKind === "planned" ? colors.plannedSticky : colors.sticky;

              return (
              <tr
                key={`${proc.processTypeId}-${rowKind}`}
                className={
                  rowKind === "planned"
                    ? SCHEDULE_ROW_BORDER_PLANNED
                    : SCHEDULE_ROW_BORDER_ACTUAL
                }
              >
                <td
                  className={cn(
                    "sticky left-0 z-10",
                    styles.processSticky,
                    SCHEDULE_STICKY_DIVIDER,
                    rowStickyBg,
                    colors.label,
                  )}
                >
                  <div className="font-medium">
                    {rowKind === "planned" ? proc.processTypeName : ""}
                  </div>
                  <div
                    className={cn(
                      "text-[10px] font-normal opacity-80",
                      rowKind === "planned" ? "" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </div>
                </td>
                {!options?.skipMetrics ? (
                  options?.metrics ?? (
                    <>
                      <td className={cn("text-center", styles.metricCell, SCHEDULE_GRID_BORDER, rowCellBg)} />
                      <td className={cn("text-center", styles.metricCell, SCHEDULE_GRID_BORDER, rowCellBg)} />
                      <td className={cn("text-center", styles.metricCell, SCHEDULE_GRID_BORDER, rowCellBg)} />
                    </>
                  )
                ) : null}
                {dates.map((date, colIndex) => {
                  const hours =
                    rowKind === "planned"
                      ? proc.plannedDailyHours[date] ?? 0
                      : proc.actualDailyHours[date] ?? proc.dailyHours[date] ?? 0;
                  const isActive = focus?.row === rowIndex && focus?.col === colIndex;
                  const isSelected = isCellInSelection(
                    rowIndex,
                    colIndex,
                    anchor,
                    focus,
                  );
                  return (
                    <DayCell
                      key={`${rowKind}-${date}`}
                      date={date}
                      row={rowIndex}
                      col={colIndex}
                      hours={hours}
                      rowBg={rowCellBg}
                      size={size}
                      dayCellWidth={dayCellWidth}
                      showMonthDividers={showMonthHeaders}
                      isHoliday={!!holidays[date]}
                      isToday={today === date}
                      isActive={isActive}
                      isSelected={isSelected}
                      isDropTarget={
                        dropPreview?.row === rowIndex &&
                        dropPreview?.col === colIndex
                      }
                      isBlockDragging={isBlockDragging && isSelected}
                      canGrab={selectionHasData && isSelected}
                      setCellRef={(el) => registerCellRef(rowIndex, colIndex, el)}
                      onPointerDown={(e) =>
                        handleCellPointerDown(rowIndex, colIndex, e)
                      }
                      onGridKeyDown={(key, shiftKey) =>
                        handleGridKeyDown(key, shiftKey, rowIndex, colIndex)
                      }
                      onCommitNavigate={handleCommitNavigate}
                      onCommitNavigateTab={handleCommitNavigateTab}
                      onShiftEnter={handleShiftEnter}
                      onClear={() => void handleDelete()}
                      onSave={(h) =>
                        onSaveCell(
                          project.projectId,
                          proc.processTypeId,
                          date,
                          h,
                          rowKind,
                        )
                      }
                    />
                  );
                })}
              </tr>
            );
            };

            return [
              renderRow(plannedRowIndex, "予定", "planned", {
                metrics: (
                  <>
                    <td
                      className={cn(
                        "text-center",
                        styles.metricCell,
                        SCHEDULE_GRID_BORDER,
                        colors.cell,
                      )}
                      rowSpan={2}
                    >
                      {proc.targetHours}
                    </td>
                    <td
                      className={cn(
                        "text-center",
                        styles.metricCell,
                        SCHEDULE_GRID_BORDER,
                        colors.cell,
                      )}
                      rowSpan={2}
                    >
                      {proc.actualHours}
                    </td>
                    <td
                      className={cn(
                        "text-center",
                        styles.metricCell,
                        SCHEDULE_GRID_BORDER,
                        colors.cell,
                      )}
                      rowSpan={2}
                    >
                      {proc.progressRate}%
                    </td>
                  </>
                ),
              }),
              renderRow(actualRowIndex, "実績", "actual", { skipMetrics: true }),
            ];
          })}
          <tr className={cn("border-t-2 border-border font-medium", PROCESS_SECTION_COLORS.forecast.cell)}>
            <td
              className={cn(
                "sticky left-0 z-10",
                styles.processSticky,
                SCHEDULE_STICKY_DIVIDER,
                PROCESS_SECTION_COLORS.forecast.sticky,
              )}
            >
              小計
            </td>
            <td className={cn("text-center", styles.metricCell, SCHEDULE_GRID_BORDER)}>
              {project.plannedHours}
            </td>
            <td className={cn("text-center", styles.metricCell, SCHEDULE_GRID_BORDER)}>
              {project.totalActualHours}
            </td>
            <td className={cn("text-center", styles.metricCell, SCHEDULE_GRID_BORDER)}>
              {project.totalProgressRate}%
            </td>
            <td colSpan={dates.length} className={cn("text-muted", styles.metricCell, styles.hint)}>
              過去平均: {project.pastAverageHours ?? "—"} h
              <span className={cn("ml-3", styles.hintSub)}>
                （ドラッグで範囲選択・データは掴んで移動 / ブラウザ戻るで取り消し / ⌘C X V A / ⌘D・⌘R）
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
