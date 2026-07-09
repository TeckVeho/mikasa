import type { TeamScheduleProjectDto } from "@logivoice/shared";
import type { GridBounds, GridCell } from "./schedule-grid-selection";
import { normalizeSelection } from "./schedule-grid-selection";
import type { ScheduleCellUpdate } from "./schedule-grid-clipboard";
import { enumerateSelection } from "./schedule-grid-clipboard";
import { getDayProcessSegments } from "./project-schedule-summary";

export type SummaryProcessHours = {
  processTypeId: string;
  hours: number;
};

export type SummaryGridCell = {
  col: number;
  date: string;
  processHours: SummaryProcessHours[];
};

export type SummaryBlockDragPayload = {
  projectId: string;
  originCol: number;
  cells: SummaryGridCell[];
};

export type SummaryProcessClipboard = {
  rows: number;
  cols: number;
  cells: SummaryProcessHours[][][];
};

const ACTUAL = "actual" as const;

export function getSummaryProcessHours(
  project: TeamScheduleProjectDto,
  date: string,
): SummaryProcessHours[] {
  return getDayProcessSegments(project, date).map((seg) => ({
    processTypeId: seg.processTypeId,
    hours: seg.hours,
  }));
}

export function getSummaryCellTotalHours(
  project: TeamScheduleProjectDto,
  col: number,
  dates: string[],
): number {
  const date = dates[col];
  if (!date) return 0;
  return getSummaryProcessHours(project, date).reduce((sum, p) => sum + p.hours, 0);
}

export function summaryCellHasData(
  project: TeamScheduleProjectDto,
  col: number,
  dates: string[],
): boolean {
  return getSummaryCellTotalHours(project, col, dates) > 0;
}

export function buildSummaryBlockDragPayload(
  projectId: string,
  project: TeamScheduleProjectDto,
  dates: string[],
  anchor: GridCell,
  focus: GridCell,
): SummaryBlockDragPayload | null {
  const range = normalizeSelection(anchor, focus);
  const cells: SummaryGridCell[] = [];

  for (const { col } of enumerateSelection(anchor, focus)) {
    const date = dates[col];
    if (!date) continue;
    const processHours = getSummaryProcessHours(project, date);
    cells.push({ col, date, processHours });
  }

  if (!cells.some((cell) => cell.processHours.length > 0)) {
    return null;
  }

  return {
    projectId,
    originCol: range.colMin,
    cells,
  };
}

export function computeSummaryBlockMoveUpdates(
  payload: SummaryBlockDragPayload,
  dropCol: number,
  dates: string[],
  bounds: GridBounds,
): { ok: true; updates: ScheduleCellUpdate[] } | { ok: false; reason: string } {
  const dCol = dropCol - payload.originCol;
  if (dCol === 0) {
    return { ok: false, reason: "same" };
  }

  const pending = new Map<string, number>();

  for (const cell of payload.cells) {
    for (const ph of cell.processHours) {
      pending.set(`${ph.processTypeId}\t${cell.date}`, 0);
    }
  }

  for (const cell of payload.cells) {
    const targetCol = cell.col + dCol;
    if (targetCol < 0 || targetCol >= bounds.colCount) {
      return { ok: false, reason: "範囲外に移動できません" };
    }
    const targetDate = dates[targetCol];
    if (!targetDate) {
      return { ok: false, reason: "範囲外に移動できません" };
    }

    for (const ph of cell.processHours) {
      pending.set(`${ph.processTypeId}\t${targetDate}`, ph.hours);
    }
  }

  const updates: ScheduleCellUpdate[] = [];
  for (const [key, hours] of pending) {
    const [processTypeId, date] = key.split("\t");
    if (!processTypeId || !date) continue;
    updates.push({
      processTypeId,
      date,
      hours,
      recordType: ACTUAL,
    });
  }

  return { ok: true, updates };
}

export function computeSummaryClearUpdates(
  project: TeamScheduleProjectDto,
  dates: string[],
  anchor: GridCell,
  focus: GridCell,
): ScheduleCellUpdate[] {
  const updates: ScheduleCellUpdate[] = [];
  for (const { col } of enumerateSelection(anchor, focus)) {
    const date = dates[col];
    if (!date) continue;
    for (const ph of getSummaryProcessHours(project, date)) {
      updates.push({
        processTypeId: ph.processTypeId,
        date,
        hours: 0,
        recordType: ACTUAL,
      });
    }
  }
  return updates;
}

export function buildSummaryClipboard(
  project: TeamScheduleProjectDto,
  dates: string[],
  anchor: GridCell,
  focus: GridCell,
): SummaryProcessClipboard {
  const range = normalizeSelection(anchor, focus);
  const cells: SummaryProcessHours[][][] = [];

  for (let row = range.rowMin; row <= range.rowMax; row++) {
    const line: SummaryProcessHours[][] = [];
    for (let col = range.colMin; col <= range.colMax; col++) {
      const date = dates[col];
      line.push(date ? getSummaryProcessHours(project, date) : []);
    }
    cells.push(line);
  }

  return {
    rows: range.rowMax - range.rowMin + 1,
    cols: range.colMax - range.colMin + 1,
    cells,
  };
}

export function computeSummaryPasteUpdates(
  clipboard: SummaryProcessClipboard,
  project: TeamScheduleProjectDto,
  dates: string[],
  startCol: number,
  bounds: GridBounds,
  holidays: Record<string, boolean>,
): { ok: true; updates: ScheduleCellUpdate[] } | { ok: false; reason: string } {
  const updates: ScheduleCellUpdate[] = [];

  for (let r = 0; r < clipboard.rows; r++) {
    for (let c = 0; c < clipboard.cols; c++) {
      const col = startCol + c;
      if (col < 0 || col >= bounds.colCount) continue;
      const date = dates[col];
      if (!date || holidays[date]) continue;

      const sourceCells = clipboard.cells[r]?.[c] ?? [];
      const existing = new Set(
        getSummaryProcessHours(project, date).map((p) => p.processTypeId),
      );
      for (const ph of sourceCells) {
        existing.delete(ph.processTypeId);
        updates.push({
          processTypeId: ph.processTypeId,
          date,
          hours: ph.hours,
          recordType: ACTUAL,
        });
      }
      for (const processTypeId of existing) {
        updates.push({
          processTypeId,
          date,
          hours: 0,
          recordType: ACTUAL,
        });
      }
    }
  }

  if (updates.length === 0) {
    return { ok: false, reason: "貼り付け先がありません" };
  }

  return { ok: true, updates };
}

export function computeSummaryFillRightUpdates(
  project: TeamScheduleProjectDto,
  dates: string[],
  anchor: GridCell,
  focus: GridCell,
): ScheduleCellUpdate[] {
  const range = normalizeSelection(anchor, focus);
  const updates: ScheduleCellUpdate[] = [];
  const sourceDate = dates[range.colMin];
  if (!sourceDate) return updates;
  const sourceHours = getSummaryProcessHours(project, sourceDate);

  for (let col = range.colMin + 1; col <= range.colMax; col++) {
    const date = dates[col];
    if (!date) continue;
    const current = getSummaryProcessHours(project, date);
    const same =
      current.length === sourceHours.length &&
      current.every((c, i) =>
        c.processTypeId === sourceHours[i]?.processTypeId &&
        c.hours === sourceHours[i]?.hours,
      );
    if (same) continue;

    for (const ph of current) {
      updates.push({
        processTypeId: ph.processTypeId,
        date,
        hours: 0,
        recordType: ACTUAL,
      });
    }
    for (const ph of sourceHours) {
      updates.push({
        processTypeId: ph.processTypeId,
        date,
        hours: ph.hours,
        recordType: ACTUAL,
      });
    }
  }

  return updates;
}

/** 単一工程セルの直接編集 */
export function buildSummaryCellSaveUpdate(
  processTypeId: string,
  date: string,
  hours: number,
): ScheduleCellUpdate {
  return { processTypeId, date, hours, recordType: ACTUAL };
}

/** 空セル編集時のデフォルト工程（先頭工程） */
export function getDefaultSummaryProcessTypeId(
  project: TeamScheduleProjectDto,
): string | null {
  return project.processes[0]?.processTypeId ?? null;
}

/** 選択範囲が単一工事行に収まる場合、その行 index を返す */
export function getSingleSelectionRow(
  anchor: GridCell,
  focus: GridCell,
): number | null {
  const range = normalizeSelection(anchor, focus);
  if (range.rowMin !== range.rowMax) return null;
  return range.rowMin;
}

export function buildSummaryBlockDragPayloadForRow(
  projectId: string,
  project: TeamScheduleProjectDto,
  dates: string[],
  anchor: GridCell,
  focus: GridCell,
  row: number,
): SummaryBlockDragPayload | null {
  const range = normalizeSelection(anchor, focus);
  const cells: SummaryGridCell[] = [];

  for (const { row: r, col } of enumerateSelection(anchor, focus)) {
    if (r !== row) continue;
    const date = dates[col];
    if (!date) continue;
    const processHours = getSummaryProcessHours(project, date);
    cells.push({ col, date, processHours });
  }

  if (!cells.some((cell) => cell.processHours.length > 0)) {
    return null;
  }

  return {
    projectId,
    originCol: range.colMin,
    cells,
  };
}

export function computeListSummaryClearUpdates(
  projects: TeamScheduleProjectDto[],
  dates: string[],
  anchor: GridCell,
  focus: GridCell,
): Map<number, ScheduleCellUpdate[]> {
  const result = new Map<number, ScheduleCellUpdate[]>();
  for (const { row, col } of enumerateSelection(anchor, focus)) {
    const project = projects[row];
    if (!project) continue;
    const date = dates[col];
    if (!date) continue;
    for (const ph of getSummaryProcessHours(project, date)) {
      const list = result.get(row) ?? [];
      list.push({
        processTypeId: ph.processTypeId,
        date,
        hours: 0,
        recordType: ACTUAL,
      });
      result.set(row, list);
    }
  }
  return result;
}

export function buildListSummaryClipboard(
  projects: TeamScheduleProjectDto[],
  dates: string[],
  anchor: GridCell,
  focus: GridCell,
): SummaryProcessClipboard {
  const range = normalizeSelection(anchor, focus);
  const cells: SummaryProcessHours[][][] = [];

  for (let row = range.rowMin; row <= range.rowMax; row++) {
    const project = projects[row];
    const line: SummaryProcessHours[][] = [];
    for (let col = range.colMin; col <= range.colMax; col++) {
      const date = dates[col];
      line.push(
        project && date ? getSummaryProcessHours(project, date) : [],
      );
    }
    cells.push(line);
  }

  return {
    rows: range.rowMax - range.rowMin + 1,
    cols: range.colMax - range.colMin + 1,
    cells,
  };
}

export function computeListSummaryPasteUpdates(
  clipboard: SummaryProcessClipboard,
  projects: TeamScheduleProjectDto[],
  dates: string[],
  startRow: number,
  startCol: number,
  bounds: GridBounds,
  holidays: Record<string, boolean>,
): Map<number, ScheduleCellUpdate[]> {
  const result = new Map<number, ScheduleCellUpdate[]>();

  for (let r = 0; r < clipboard.rows; r++) {
    for (let c = 0; c < clipboard.cols; c++) {
      const row = startRow + r;
      const col = startCol + c;
      if (row < 0 || row >= bounds.rowCount || col < 0 || col >= bounds.colCount) {
        continue;
      }
      const project = projects[row];
      const date = dates[col];
      if (!project || !date || holidays[date]) continue;

      const sourceCells = clipboard.cells[r]?.[c] ?? [];
      const existing = new Set(
        getSummaryProcessHours(project, date).map((p) => p.processTypeId),
      );
      const list = result.get(row) ?? [];

      for (const ph of sourceCells) {
        existing.delete(ph.processTypeId);
        list.push({
          processTypeId: ph.processTypeId,
          date,
          hours: ph.hours,
          recordType: ACTUAL,
        });
      }
      for (const processTypeId of existing) {
        list.push({
          processTypeId,
          date,
          hours: 0,
          recordType: ACTUAL,
        });
      }
      result.set(row, list);
    }
  }

  return result;
}

export function summaryCellHasDataAt(
  projects: TeamScheduleProjectDto[],
  dates: string[],
  row: number,
  col: number,
): boolean {
  const project = projects[row];
  if (!project) return false;
  return summaryCellHasData(project, col, dates);
}
