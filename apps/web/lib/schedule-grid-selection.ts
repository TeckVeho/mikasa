export type GridCell = { row: number; col: number };

export type GridBounds = { rowCount: number; colCount: number };

export function normalizeSelection(anchor: GridCell, focus: GridCell) {
  return {
    rowMin: Math.min(anchor.row, focus.row),
    rowMax: Math.max(anchor.row, focus.row),
    colMin: Math.min(anchor.col, focus.col),
    colMax: Math.max(anchor.col, focus.col),
  };
}

export function isCellInSelection(
  row: number,
  col: number,
  anchor: GridCell | null,
  focus: GridCell | null,
): boolean {
  if (!anchor || !focus) return false;
  const range = normalizeSelection(anchor, focus);
  return (
    row >= range.rowMin &&
    row <= range.rowMax &&
    col >= range.colMin &&
    col <= range.colMax
  );
}

export function moveGridCell(
  cell: GridCell,
  key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
  bounds: GridBounds,
): GridCell {
  let { row, col } = cell;
  switch (key) {
    case "ArrowUp":
      row = Math.max(0, row - 1);
      break;
    case "ArrowDown":
      row = Math.min(bounds.rowCount - 1, row + 1);
      break;
    case "ArrowLeft":
      col = Math.max(0, col - 1);
      break;
    case "ArrowRight":
      col = Math.min(bounds.colCount - 1, col + 1);
      break;
  }
  return { row, col };
}

export function isArrowKey(
  key: string,
): key is "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" {
  return (
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "ArrowLeft" ||
    key === "ArrowRight"
  );
}
