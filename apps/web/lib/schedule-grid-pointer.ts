import type { GridCell } from "./schedule-grid-selection";

export const SCHEDULE_CELL_ATTR = "data-schedule-cell";

export function parseScheduleCellElement(el: Element | null): GridCell | null {
  if (!el) return null;
  const cell = el.closest(`[${SCHEDULE_CELL_ATTR}]`);
  if (!cell) return null;
  const row = Number(cell.getAttribute("data-schedule-row"));
  const col = Number(cell.getAttribute("data-schedule-col"));
  if (!Number.isFinite(row) || !Number.isFinite(col)) return null;
  return { row, col };
}

export function findScheduleCellFromPoint(x: number, y: number): GridCell | null {
  const el = document.elementFromPoint(x, y);
  return parseScheduleCellElement(el);
}
