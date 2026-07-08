export type GridCell = { row: number; col: number };

export type GridBounds = { rowCount: number; colCount: number };

export type SelectionEdges = {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
};

const NO_SELECTION_EDGES: SelectionEdges = {
  top: false,
  bottom: false,
  left: false,
  right: false,
};

export function normalizeSelection(anchor: GridCell, focus: GridCell) {
  return {
    rowMin: Math.min(anchor.row, focus.row),
    rowMax: Math.max(anchor.row, focus.row),
    colMin: Math.min(anchor.col, focus.col),
    colMax: Math.max(anchor.col, focus.col),
  };
}

/** 起点を左上、終点を右下に正規化（スプレッドシート風） */
export function canonicalizeSelection(
  anchor: GridCell,
  focus: GridCell,
): { anchor: GridCell; focus: GridCell } {
  const range = normalizeSelection(anchor, focus);
  return {
    anchor: { row: range.rowMin, col: range.colMin },
    focus: { row: range.rowMax, col: range.colMax },
  };
}

/** 選択範囲のアクティブセル（起点）: クリックした行の左端 */
export function getActiveCell(
  anchor: GridCell | null,
  focus: GridCell | null,
): GridCell | null {
  if (!anchor && !focus) return null;
  if (!anchor || !focus) return anchor ?? focus;
  if (!isMultiCellSelection(anchor, focus)) return anchor;
  const range = normalizeSelection(anchor, focus);
  return { row: anchor.row, col: range.colMin };
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

export function isMultiCellSelection(
  anchor: GridCell | null,
  focus: GridCell | null,
): boolean {
  if (!anchor || !focus) return false;
  const range = normalizeSelection(anchor, focus);
  return range.rowMin !== range.rowMax || range.colMin !== range.colMax;
}

export function getSelectionEdgeFlags(
  row: number,
  col: number,
  anchor: GridCell | null,
  focus: GridCell | null,
): SelectionEdges {
  if (!anchor || !focus) return NO_SELECTION_EDGES;
  if (!isCellInSelection(row, col, anchor, focus)) return NO_SELECTION_EDGES;

  const range = normalizeSelection(anchor, focus);
  return {
    top: row === range.rowMin,
    bottom: row === range.rowMax,
    left: col === range.colMin,
    right: col === range.colMax,
  };
}

const SELECTION_EDGE_COLOR = "var(--color-primary)";
const SELECTION_EDGE_WIDTH = "2px";

export function buildSelectionEdgeShadow(
  edges: SelectionEdges,
): string | undefined {
  const parts: string[] = [];
  if (edges.top) {
    parts.push(
      `inset 0 ${SELECTION_EDGE_WIDTH} 0 0 ${SELECTION_EDGE_COLOR}`,
    );
  }
  if (edges.bottom) {
    parts.push(
      `inset 0 -${SELECTION_EDGE_WIDTH} 0 0 ${SELECTION_EDGE_COLOR}`,
    );
  }
  if (edges.left) {
    parts.push(
      `inset ${SELECTION_EDGE_WIDTH} 0 0 0 ${SELECTION_EDGE_COLOR}`,
    );
  }
  if (edges.right) {
    parts.push(
      `inset -${SELECTION_EDGE_WIDTH} 0 0 0 ${SELECTION_EDGE_COLOR}`,
    );
  }
  return parts.length > 0 ? parts.join(", ") : undefined;
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
