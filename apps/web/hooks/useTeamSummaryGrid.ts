"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { TeamScheduleProjectDto } from "@logivoice/shared";
import type { ScheduleCellUpdate } from "@/lib/schedule-grid-clipboard";
import { clipboardToTsv } from "@/lib/schedule-grid-clipboard";
import {
  buildListSummaryClipboard,
  buildSummaryBlockDragPayloadForRow,
  computeListSummaryClearUpdates,
  computeListSummaryPasteUpdates,
  computeSummaryBlockMoveUpdates,
  computeSummaryFillRightUpdates,
  getDefaultSummaryProcessTypeId,
  getSingleSelectionRow,
  summaryCellHasDataAt,
  type SummaryProcessClipboard,
} from "@/lib/project-summary-grid";
import {
  summaryProjectIndexFromRow,
  summaryRecordTypeFromRow,
} from "@/lib/project-schedule-summary";
import {
  jumpToDataEdge,
  jumpToRowEdge,
  jumpToSheetCorner,
  navigateTab,
  selectAllCells,
} from "@/lib/schedule-grid-navigation";
import { findSummaryGridCellFromPoint } from "@/lib/schedule-grid-pointer";
import {
  type GridCell,
  getActiveCell,
  getSelectionEdgeFlags,
  isArrowKey,
  isCellInSelection,
  moveGridCell,
} from "@/lib/schedule-grid-selection";

const BLOCK_DRAG_THRESHOLD = 5;

export type TeamSummaryProjectEntry = {
  teamId: string;
  project: TeamScheduleProjectDto;
};

type Options = {
  projects: TeamSummaryProjectEntry[];
  dates: string[];
  holidays: Record<string, boolean>;
  tableRootRef: RefObject<HTMLDivElement | null>;
  onSaveCell: (
    teamId: string,
    projectId: string,
    processTypeId: string,
    date: string,
    hours: number,
    recordType: "planned" | "actual",
  ) => void;
  onBulkSave: (
    teamId: string,
    projectId: string,
    updates: ScheduleCellUpdate[],
  ) => Promise<boolean>;
  onUndo?: () => void;
};

export function useTeamSummaryGrid({
  projects,
  dates,
  holidays,
  tableRootRef,
  onSaveCell,
  onBulkSave,
  onUndo,
}: Options) {
  const projectDtos = projects.map((p) => p.project);
  const rowCount = projects.length * 2;
  const colCount = dates.length;
  const bounds = { rowCount, colCount };

  const [anchor, setAnchor] = useState<GridCell | null>(null);
  const [focus, setFocus] = useState<GridCell | null>(null);
  const [isBlockDragging, setIsBlockDragging] = useState(false);
  const [dropPreview, setDropPreview] = useState<GridCell | null>(null);

  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const clipboardRef = useRef<SummaryProcessClipboard | null>(null);
  const selectionRef = useRef<{ anchor: GridCell | null; focus: GridCell | null }>({
    anchor: null,
    focus: null,
  });
  const rangeSelectRef = useRef(false);
  const rangeStartRef = useRef<GridCell | null>(null);
  const blockDragRef = useRef<{
    row: number;
    originCol: number;
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

  const getEntry = useCallback(
    (row: number) => projects[summaryProjectIndexFromRow(row)] ?? null,
    [projects],
  );

  const hasData = useCallback(
    (row: number, col: number) => summaryCellHasDataAt(projectDtos, dates, row, col),
    [dates, projectDtos],
  );

  const registerCellRef = useCallback(
    (row: number, col: number, el: HTMLTableCellElement | null) => {
      const key = `${row}-${col}`;
      if (el) cellRefs.current.set(key, el);
      else cellRefs.current.delete(key);
    },
    [],
  );

  const focusCellElement = useCallback((cell: GridCell) => {
    const el = cellRefs.current.get(`${cell.row}-${cell.col}`);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  useEffect(() => {
    const active = getActiveCell(anchor, focus);
    if (!active) return;
    focusCellElement(active);
  }, [anchor, focus, focusCellElement]);

  const applySelection = useCallback(
    (
      nextAnchor: GridCell,
      nextFocus: GridCell,
      options?: { focusDom?: boolean },
    ) => {
      const next = { anchor: nextAnchor, focus: nextFocus };
      selectionRef.current = next;
      flushSync(() => {
        setAnchor(nextAnchor);
        setFocus(nextFocus);
      });
      if (options?.focusDom !== false) {
        const active = getActiveCell(nextAnchor, nextFocus);
        if (active) focusCellElement(active);
      }
    },
    [focusCellElement],
  );

  const selectionHasDataOnSingleRow = useCallback(
    (a: GridCell | null, f: GridCell | null) => {
      if (!a || !f) return false;
      const row = getSingleSelectionRow(a, f);
      if (row == null) return false;
      const entry = getEntry(row);
      if (!entry) return false;
      const payload = buildSummaryBlockDragPayloadForRow(
        entry.project.projectId,
        entry.project,
        dates,
        a,
        f,
        row,
      );
      return payload !== null;
    },
    [dates, getEntry],
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
    async (row: number, originCol: number, dropCol: number) => {
      const { anchor: a, focus: f } = selectionRef.current;
      if (!a || !f) return;
      const entry = getEntry(row);
      if (!entry) return;

      const payload = buildSummaryBlockDragPayloadForRow(
        entry.project.projectId,
        entry.project,
        dates,
        a,
        f,
        row,
      );
      if (!payload) return;

      const result = computeSummaryBlockMoveUpdates(
        { ...payload, originCol },
        dropCol,
        dates,
        { rowCount: 1, colCount },
      );
      if (!result.ok) return;

      const ok = await onBulkSave(
        entry.teamId,
        entry.project.projectId,
        result.updates,
      );
      if (!ok) return;

      const dCol = dropCol - originCol;
      applySelection(
        { row, col: a.col + dCol },
        { row, col: f.col + dCol },
      );
    },
    [applySelection, dates, getEntry, onBulkSave],
  );

  const startBlockDrag = useCallback(
    (
      row: number,
      originCol: number,
      selAnchor: GridCell,
      selFocus: GridCell,
      startX: number,
      startY: number,
    ) => {
      const entry = getEntry(row);
      if (!entry) return;
      const payload = buildSummaryBlockDragPayloadForRow(
        entry.project.projectId,
        entry.project,
        dates,
        selAnchor,
        selFocus,
        row,
      );
      if (!payload) return;

      stopBlockDrag();
      blockDragRef.current = {
        row,
        originCol,
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

        const cell = findSummaryGridCellFromPoint(e.clientX, e.clientY);
        if (cell?.row === drag.row) {
          drag.dropCell = cell;
          setDropPreview(cell);
        } else {
          drag.dropCell = null;
          setDropPreview(null);
        }
      }

      function onPointerUp() {
        const drag = blockDragRef.current;
        stopBlockDrag();
        if (drag?.active && drag.dropCell) {
          void executeBlockMove(drag.row, drag.originCol, drag.dropCell.col);
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
    [dates, executeBlockMove, getEntry, stopBlockDrag],
  );

  const startRangeSelect = useCallback(() => {
    rangeSelectRef.current = true;

    function onPointerMove(e: PointerEvent) {
      if (!rangeSelectRef.current) return;
      const cell = findSummaryGridCellFromPoint(e.clientX, e.clientY);
      if (!cell) return;
      const start = rangeStartRef.current;
      if (!start) return;

      const { focus: f } = selectionRef.current;
      if (f?.row === cell.row && f?.col === cell.col) return;
      applySelection(start, cell, { focusDom: false });
    }

    function onPointerUp() {
      stopRangeSelect();
      rangeStartRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }, [applySelection, stopRangeSelect]);

  const handleCellPointerDown = useCallback(
    (row: number, col: number, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      stopBlockDrag();

      const cell: GridCell = { row, col };
      const { anchor: prevAnchor, focus: prevFocus } = selectionRef.current;
      const wasInSelection = isCellInSelection(row, col, prevAnchor, prevFocus);
      const shift = e.shiftKey;
      const cellHasData = hasData(row, col);
      const multiHasData = selectionHasDataOnSingleRow(prevAnchor, prevFocus);

      let nextAnchor: GridCell;
      let nextFocus: GridCell;
      let useRangeSelect = false;

      if (shift) {
        nextAnchor = prevAnchor ?? prevFocus ?? cell;
        nextFocus = cell;
        useRangeSelect = true;
      } else if (wasInSelection && multiHasData) {
        nextAnchor = prevAnchor!;
        nextFocus = cell;
      } else {
        nextAnchor = cell;
        nextFocus = cell;
        useRangeSelect = !cellHasData;
      }

      applySelection(nextAnchor, nextFocus);

      if (useRangeSelect) {
        rangeStartRef.current = shift
          ? (prevAnchor ?? prevFocus ?? cell)
          : cell;
        startRangeSelect();
      } else {
        stopRangeSelect();
        if (selectionHasDataOnSingleRow(nextAnchor, nextFocus)) {
          const dragRow = getSingleSelectionRow(nextAnchor, nextFocus);
          if (dragRow != null) {
            startBlockDrag(
              dragRow,
              col,
              nextAnchor,
              nextFocus,
              e.clientX,
              e.clientY,
            );
          }
        }
      }
    },
    [
      applySelection,
      hasData,
      selectionHasDataOnSingleRow,
      startBlockDrag,
      startRangeSelect,
      stopBlockDrag,
      stopRangeSelect,
    ],
  );

  const applyFocus = useCallback(
    (next: GridCell, extend: boolean) => {
      if (extend) {
        applySelection(anchor ?? focus ?? next, next);
      } else {
        applySelection(next, next);
      }
    },
    [anchor, applySelection, focus],
  );

  const handleGridKeyDown = useCallback(
    (key: string, shiftKey: boolean, row: number, col: number) => {
      if (!isArrowKey(key)) return;

      const active = getActiveCell(anchor, focus) ?? { row, col };
      const current = shiftKey ? (focus ?? active) : active;
      const next = moveGridCell(current, key, bounds);

      if (shiftKey) {
        applySelection(anchor ?? active, next);
      } else {
        applySelection(next, next);
      }
    },
    [anchor, applySelection, bounds, focus],
  );

  const handleCommitNavigateTab = useCallback(
    (reverse: boolean, row: number, col: number) => {
      const active = getActiveCell(anchor, focus) ?? { row, col };
      const next = navigateTab(active, bounds, reverse);
      applySelection(next, next);
    },
    [anchor, applySelection, bounds, focus],
  );

  const handleCommitNavigate = useCallback(
    (row: number, col: number) => {
      const active = getActiveCell(anchor, focus) ?? { row, col };
      const next = moveGridCell(active, "ArrowRight", bounds);
      applySelection(next, next);
    },
    [anchor, applySelection, bounds, focus],
  );

  const bulkApplyByRow = useCallback(
    async (updatesByRow: Map<number, ScheduleCellUpdate[]>) => {
      for (const [row, updates] of updatesByRow) {
        if (updates.length === 0) continue;
        const entry = getEntry(row);
        if (!entry) continue;
        const ok = await onBulkSave(
          entry.teamId,
          entry.project.projectId,
          updates,
        );
        if (!ok) return false;
      }
      return true;
    },
    [getEntry, onBulkSave],
  );

  const handleDelete = useCallback(async () => {
    if (!anchor || !focus) return;
    const updatesByRow = computeListSummaryClearUpdates(
      projectDtos,
      dates,
      anchor,
      focus,
    );
    await bulkApplyByRow(updatesByRow);
  }, [anchor, bulkApplyByRow, dates, focus, projectDtos]);

  const handleCopy = useCallback(async () => {
    if (!anchor || !focus) return;
    const clip = buildListSummaryClipboard(projectDtos, dates, anchor, focus);
    clipboardRef.current = clip;
    const tsv = clipboardToTsv({
      rows: clip.rows,
      cols: clip.cols,
      values: clip.cells.map((line) =>
        line.map((cell) => cell.reduce((sum, p) => sum + p.hours, 0)),
      ),
    });
    try {
      await navigator.clipboard.writeText(tsv);
    } catch {
      // アプリ内コピーのみ
    }
  }, [anchor, dates, focus, projectDtos]);

  const handleCut = useCallback(async () => {
    await handleCopy();
    await handleDelete();
  }, [handleCopy, handleDelete]);

  const handleFillRight = useCallback(async () => {
    if (!anchor || !focus) return;
    const row = getSingleSelectionRow(anchor, focus);
    if (row == null) return;
    const entry = getEntry(row);
    if (!entry) return;
    const recordType = summaryRecordTypeFromRow(row);
    const fillUpdates = computeSummaryFillRightUpdates(
      entry.project,
      dates,
      anchor,
      focus,
      recordType,
    );
    if (fillUpdates.length === 0) return;
    await onBulkSave(entry.teamId, entry.project.projectId, fillUpdates);
  }, [anchor, dates, focus, getEntry, onBulkSave]);

  const handleSelectAll = useCallback(() => {
    const { anchor: a, focus: f } = selectAllCells(bounds);
    applySelection(a, f);
  }, [applySelection, bounds]);

  const handlePaste = useCallback(async () => {
    const active = getActiveCell(anchor, focus);
    if (!active) return;

    let clip = clipboardRef.current;
    if (!clip) {
      try {
        const text = await navigator.clipboard.readText();
        const lines = text.trim().split(/\r?\n/);
        if (lines.length === 0 || !lines[0]?.trim()) return;
        const values = lines.map((line) =>
          line.split("\t").map((token) => {
            const t = token.trim();
            if (t === "") return 0;
            const n = Number(t);
            return Number.isFinite(n) && n >= 0 ? n : 0;
          }),
        );
        const cols = Math.max(...values.map((row) => row.length), 0);
        const defaultEntry = getEntry(active.row);
        const defaultProcessId = defaultEntry
          ? getDefaultSummaryProcessTypeId(defaultEntry.project)
          : null;
        if (!defaultProcessId) return;
        const recordType = summaryRecordTypeFromRow(active.row);
        clip = {
          rows: values.length,
          cols,
          recordType,
          cells: values.map((row) =>
            row.map((hours) =>
              hours > 0
                ? [{ processTypeId: defaultProcessId, hours }]
                : [],
            ),
          ),
        };
      } catch {
        return;
      }
    }
    if (!clip) return;

    const updatesByRow = computeListSummaryPasteUpdates(
      clip,
      projectDtos,
      dates,
      active.row,
      active.col,
      bounds,
      holidays,
    );
    const ok = await bulkApplyByRow(updatesByRow);
    if (ok) {
      const endRow = Math.min(active.row + clip.rows - 1, rowCount - 1);
      const endCol = Math.min(active.col + clip.cols - 1, colCount - 1);
      applySelection(active, { row: endRow, col: endCol });
    }
  }, [
    anchor,
    applySelection,
    bounds,
    bulkApplyByRow,
    colCount,
    dates,
    focus,
    getEntry,
    holidays,
    projectDtos,
    rowCount,
  ]);

  const saveProcessCell = useCallback(
    (
      row: number,
      processTypeId: string,
      date: string,
      hours: number,
      recordType: "planned" | "actual",
    ) => {
      const entry = getEntry(row);
      if (!entry) return;
      onSaveCell(
        entry.teamId,
        entry.project.projectId,
        processTypeId,
        date,
        hours,
        recordType,
      );
    },
    [getEntry, onSaveCell],
  );

  const saveDefaultCell = useCallback(
    (row: number, col: number, hours: number) => {
      const entry = getEntry(row);
      const date = dates[col];
      if (!entry || !date) return;
      const processTypeId = getDefaultSummaryProcessTypeId(entry.project);
      if (!processTypeId) return;
      onSaveCell(
        entry.teamId,
        entry.project.projectId,
        processTypeId,
        date,
        hours,
        summaryRecordTypeFromRow(row),
      );
    },
    [dates, getEntry, onSaveCell],
  );

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
        if (key === "r") {
          e.preventDefault();
          void handleFillRight();
          return;
        }
        if (key === "z" && !shift) {
          e.preventDefault();
          onUndo?.();
          return;
        }
        if (isArrowKey(e.key) && anchor && !isEditing) {
          e.preventDefault();
          const active = getActiveCell(anchor, focus)!;
          const from = shift ? (focus ?? active) : active;
          const next = jumpToDataEdge(from, e.key, bounds, hasData);
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
      if (!anchor) return;

      const active = getActiveCell(anchor, focus)!;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        void handleDelete();
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        applyFocus(navigateTab(active, bounds, shift), false);
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        applyFocus(jumpToRowEdge(active, bounds, true), shift);
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        applyFocus(jumpToRowEdge(active, bounds, false), shift);
        return;
      }

      if (isArrowKey(e.key)) {
        e.preventDefault();
        const from = shift ? (focus ?? active) : active;
        const next = moveGridCell(from, e.key, bounds);
        applyFocus(next, shift);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    anchor,
    applyFocus,
    bounds,
    focus,
    handleCopy,
    handleCut,
    handleDelete,
    handleFillRight,
    handlePaste,
    handleSelectAll,
    hasData,
    onUndo,
    tableRootRef,
  ]);

  const activeCell = getActiveCell(anchor, focus);
  const selectionHasData = anchor && focus
    ? selectionHasDataOnSingleRow(anchor, focus)
    : false;

  const getCellInteraction = useCallback(
    (row: number, col: number) => {
      const isActive = activeCell?.row === row && activeCell?.col === col;
      const isSelected = isCellInSelection(row, col, anchor, focus);
      const selectionEdges = getSelectionEdgeFlags(row, col, anchor, focus);

      return {
        row,
        col,
        isActive,
        isSelected,
        selectionEdges,
        isDropTarget: dropPreview?.row === row && dropPreview?.col === col,
        isBlockDragging: isBlockDragging && isSelected,
        canGrab: selectionHasData && isSelected,
        onPointerDown: (e: React.PointerEvent) =>
          handleCellPointerDown(row, col, e),
        onCancelBlockDrag: stopBlockDrag,
        onGridKeyDown: (key: string, shiftKey: boolean) =>
          handleGridKeyDown(key, shiftKey, row, col),
        onCommitNavigate: () => handleCommitNavigate(row, col),
        onCommitNavigateTab: (reverse: boolean) =>
          handleCommitNavigateTab(reverse, row, col),
        onClear: () => void handleDelete(),
        setCellRef: (el: HTMLTableCellElement | null) =>
          registerCellRef(row, col, el),
      };
    },
    [
      activeCell,
      anchor,
      dropPreview,
      focus,
      handleCellPointerDown,
      handleCommitNavigate,
      handleCommitNavigateTab,
      handleDelete,
      handleGridKeyDown,
      isBlockDragging,
      registerCellRef,
      selectionHasData,
      stopBlockDrag,
    ],
  );

  return {
    getCellInteraction,
    saveProcessCell,
    saveDefaultCell,
  };
}
