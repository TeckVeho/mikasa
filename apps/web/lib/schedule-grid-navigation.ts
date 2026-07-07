import type { GridBounds, GridCell } from "./schedule-grid-selection";

export function navigateTab(
  cell: GridCell,
  bounds: GridBounds,
  reverse: boolean,
): GridCell {
  if (reverse) {
    if (cell.col > 0) return { row: cell.row, col: cell.col - 1 };
    if (cell.row > 0) return { row: cell.row - 1, col: bounds.colCount - 1 };
    return cell;
  }
  if (cell.col < bounds.colCount - 1) return { row: cell.row, col: cell.col + 1 };
  if (cell.row < bounds.rowCount - 1) return { row: cell.row + 1, col: 0 };
  return cell;
}

export function jumpToRowEdge(
  cell: GridCell,
  bounds: GridBounds,
  toStart: boolean,
): GridCell {
  return { row: cell.row, col: toStart ? 0 : bounds.colCount - 1 };
}

export function jumpToSheetCorner(bounds: GridBounds, toEnd: boolean): GridCell {
  if (toEnd) {
    return { row: bounds.rowCount - 1, col: bounds.colCount - 1 };
  }
  return { row: 0, col: 0 };
}

type Direction = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

const DIRECTION_DELTA: Record<Direction, { dr: number; dc: number }> = {
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
};

export function jumpToDataEdge(
  start: GridCell,
  direction: Direction,
  bounds: GridBounds,
  hasData: (row: number, col: number) => boolean,
): GridCell {
  const { dr, dc } = DIRECTION_DELTA[direction];
  let { row, col } = start;

  const inBounds = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < bounds.rowCount && c < bounds.colCount;

  if (hasData(row, col)) {
    let nextRow = row + dr;
    let nextCol = col + dc;
    while (inBounds(nextRow, nextCol) && hasData(nextRow, nextCol)) {
      row = nextRow;
      col = nextCol;
      nextRow = row + dr;
      nextCol = col + dc;
    }
    if (inBounds(nextRow, nextCol)) {
      row = nextRow;
      col = nextCol;
    }
    return { row, col };
  }

  let nextRow = row + dr;
  let nextCol = col + dc;
  while (inBounds(nextRow, nextCol)) {
    row = nextRow;
    col = nextCol;
    if (hasData(row, col)) break;
    nextRow = row + dr;
    nextCol = col + dc;
  }
  return { row, col };
}

export function selectAllCells(bounds: GridBounds): {
  anchor: GridCell;
  focus: GridCell;
} {
  return {
    anchor: { row: 0, col: 0 },
    focus: { row: bounds.rowCount - 1, col: bounds.colCount - 1 },
  };
}
