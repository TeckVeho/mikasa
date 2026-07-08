import type { GridCell, GridBounds } from "./schedule-grid-selection";
import { normalizeSelection } from "./schedule-grid-selection";

export type ScheduleGridCell = {
  row: number;
  col: number;
  processTypeId: string;
  date: string;
  hours: number;
};

export type ScheduleCellUpdate = {
  processTypeId: string;
  date: string;
  hours: number;
  recordType?: "planned" | "actual";
};

type ResolvedCell = {
  processTypeId: string;
  date: string;
  recordType?: "planned" | "actual";
};

export type BlockDragPayload = {
  projectId: string;
  originRow: number;
  originCol: number;
  cells: ScheduleGridCell[];
};

export type ScheduleClipboard = {
  rows: number;
  cols: number;
  values: number[][];
};

export function enumerateSelection(
  anchor: GridCell,
  focus: GridCell,
): GridCell[] {
  const range = normalizeSelection(anchor, focus);
  const cells: GridCell[] = [];
  for (let row = range.rowMin; row <= range.rowMax; row++) {
    for (let col = range.colMin; col <= range.colMax; col++) {
      cells.push({ row, col });
    }
  }
  return cells;
}

export function cellKey(processTypeId: string, date: string): string {
  return `${processTypeId}\t${date}`;
}

export function buildBlockDragPayload(
  projectId: string,
  anchor: GridCell,
  focus: GridCell,
  getCell: (row: number, col: number) => Omit<ScheduleGridCell, "row" | "col">,
): BlockDragPayload | null {
  const cells = enumerateSelection(anchor, focus).map(({ row, col }) => {
    const data = getCell(row, col);
    return { row, col, ...data };
  });
  if (!cells.some((c) => c.hours > 0)) return null;
  return {
    projectId,
    originRow: focus.row,
    originCol: focus.col,
    cells,
  };
}

export function computeBlockMoveUpdates(
  payload: BlockDragPayload,
  dropRow: number,
  dropCol: number,
  bounds: GridBounds,
  resolveCell: (row: number, col: number) => ResolvedCell,
): { ok: true; updates: ScheduleCellUpdate[] } | { ok: false; reason: string } {
  const dRow = dropRow - payload.originRow;
  const dCol = dropCol - payload.originCol;
  if (dRow === 0 && dCol === 0) {
    return { ok: false, reason: "same" };
  }

  const pending = new Map<string, number>();

  for (const cell of payload.cells) {
    pending.set(cellKey(cell.processTypeId, cell.date), 0);
  }

  for (const cell of payload.cells) {
    const targetRow = cell.row + dRow;
    const targetCol = cell.col + dCol;

    if (
      targetRow < 0 ||
      targetCol < 0 ||
      targetRow >= bounds.rowCount ||
      targetCol >= bounds.colCount
    ) {
      return { ok: false, reason: "範囲外に移動できません" };
    }

    const target = resolveCell(targetRow, targetCol);
    const key = cellKey(target.processTypeId, target.date);
    pending.set(key, cell.hours);
  }

  const updates: ScheduleCellUpdate[] = [];
  for (const [key, hours] of pending) {
    const [processTypeId, date] = key.split("\t");
    if (processTypeId && date) {
      updates.push({ processTypeId, date, hours });
    }
  }

  return { ok: true, updates };
}

export function computeClearSelectionUpdates(
  anchor: GridCell,
  focus: GridCell,
  resolveCell: (row: number, col: number) => ResolvedCell,
  getHours: (row: number, col: number) => number,
): ScheduleCellUpdate[] {
  const updates: ScheduleCellUpdate[] = [];
  for (const { row, col } of enumerateSelection(anchor, focus)) {
    if (getHours(row, col) <= 0) continue;
    const { processTypeId, date, recordType } = resolveCell(row, col);
    updates.push({ processTypeId, date, hours: 0, recordType });
  }
  return updates;
}

export function buildClipboardFromSelection(
  anchor: GridCell,
  focus: GridCell,
  getHours: (row: number, col: number) => number,
): ScheduleClipboard {
  const range = normalizeSelection(anchor, focus);
  const values: number[][] = [];

  for (let row = range.rowMin; row <= range.rowMax; row++) {
    const line: number[] = [];
    for (let col = range.colMin; col <= range.colMax; col++) {
      line.push(getHours(row, col));
    }
    values.push(line);
  }

  return {
    rows: range.rowMax - range.rowMin + 1,
    cols: range.colMax - range.colMin + 1,
    values,
  };
}

export function clipboardToTsv(clipboard: ScheduleClipboard): string {
  return clipboard.values
    .map((row) => row.map((v) => (v > 0 ? String(v) : "")).join("\t"))
    .join("\n");
}

export function parseTsvToClipboard(text: string): ScheduleClipboard | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const lines = trimmed.split(/\r?\n/);
  const values = lines.map((line) =>
    line.split("\t").map((token) => {
      const t = token.trim();
      if (t === "") return 0;
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    }),
  );

  const cols = Math.max(...values.map((row) => row.length), 0);
  if (cols === 0) return null;

  return { rows: values.length, cols, values };
}

export function computePasteUpdates(
  clipboard: ScheduleClipboard,
  startRow: number,
  startCol: number,
  bounds: GridBounds,
  holidays: Record<string, boolean>,
  resolveCell: (row: number, col: number) => ResolvedCell,
): { ok: true; updates: ScheduleCellUpdate[] } | { ok: false; reason: string } {
  const updates: ScheduleCellUpdate[] = [];

  for (let r = 0; r < clipboard.rows; r++) {
    for (let c = 0; c < clipboard.cols; c++) {
      const row = startRow + r;
      const col = startCol + c;
      if (row >= bounds.rowCount || col >= bounds.colCount) continue;

      const { processTypeId, date, recordType } = resolveCell(row, col);
      if (holidays[date]) continue;

      const hours = clipboard.values[r]?.[c] ?? 0;
      updates.push({ processTypeId, date, hours, recordType });
    }
  }

  if (updates.length === 0) {
    return { ok: false, reason: "貼り付け先がありません" };
  }

  return { ok: true, updates };
}

export function computeFillDownUpdates(
  anchor: GridCell,
  focus: GridCell,
  getHours: (row: number, col: number) => number,
  resolveCell: (row: number, col: number) => ResolvedCell,
): ScheduleCellUpdate[] {
  const range = normalizeSelection(anchor, focus);
  const updates: ScheduleCellUpdate[] = [];

  for (let col = range.colMin; col <= range.colMax; col++) {
    const topValue = getHours(range.rowMin, col);
    for (let row = range.rowMin + 1; row <= range.rowMax; row++) {
      if (getHours(row, col) === topValue) continue;
      const { processTypeId, date, recordType } = resolveCell(row, col);
      updates.push({ processTypeId, date, hours: topValue, recordType });
    }
  }

  return updates;
}

export function computeFillRightUpdates(
  anchor: GridCell,
  focus: GridCell,
  getHours: (row: number, col: number) => number,
  resolveCell: (row: number, col: number) => ResolvedCell,
): ScheduleCellUpdate[] {
  const range = normalizeSelection(anchor, focus);
  const updates: ScheduleCellUpdate[] = [];

  for (let row = range.rowMin; row <= range.rowMax; row++) {
    const leftValue = getHours(row, range.colMin);
    for (let col = range.colMin + 1; col <= range.colMax; col++) {
      if (getHours(row, col) === leftValue) continue;
      const { processTypeId, date, recordType } = resolveCell(row, col);
      updates.push({ processTypeId, date, hours: leftValue, recordType });
    }
  }

  return updates;
}
