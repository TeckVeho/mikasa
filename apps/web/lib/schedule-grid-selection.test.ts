import { describe, expect, it } from "vitest";
import {
  buildSelectionEdgeShadow,
  canonicalizeSelection,
  getSelectionEdgeFlags,
  getActiveCell,
  isMultiCellSelection,
} from "./schedule-grid-selection";

describe("schedule-grid-selection edges", () => {
  it("canonicalizeSelection uses top-left as anchor", () => {
    expect(
      canonicalizeSelection({ row: 1, col: 5 }, { row: 3, col: 2 }),
    ).toEqual({
      anchor: { row: 1, col: 2 },
      focus: { row: 3, col: 5 },
    });
  });

  it("getActiveCell returns left edge on anchor row for multi selection", () => {
    expect(
      getActiveCell({ row: 0, col: 4 }, { row: 2, col: 1 }),
    ).toEqual({ row: 0, col: 1 });
    expect(
      getActiveCell({ row: 2, col: 5 }, { row: 2, col: 9 }),
    ).toEqual({ row: 2, col: 5 });
    expect(getActiveCell({ row: 1, col: 2 }, { row: 1, col: 2 })).toEqual({
      row: 1,
      col: 2,
    });
  });
  it("isMultiCellSelection", () => {
    expect(isMultiCellSelection({ row: 0, col: 0 }, { row: 0, col: 0 })).toBe(
      false,
    );
    expect(isMultiCellSelection({ row: 0, col: 0 }, { row: 1, col: 0 })).toBe(
      true,
    );
    expect(isMultiCellSelection(null, { row: 0, col: 0 })).toBe(false);
  });

  it("getSelectionEdgeFlags for single cell", () => {
    const anchor = { row: 1, col: 2 };
    expect(getSelectionEdgeFlags(1, 2, anchor, anchor)).toEqual({
      top: true,
      bottom: true,
      left: true,
      right: true,
    });
  });

  it("getSelectionEdgeFlags for rectangular range", () => {
    const anchor = { row: 0, col: 1 };
    const focus = { row: 2, col: 3 };

    expect(getSelectionEdgeFlags(0, 1, anchor, focus)).toEqual({
      top: true,
      bottom: false,
      left: true,
      right: false,
    });
    expect(getSelectionEdgeFlags(1, 2, anchor, focus)).toEqual({
      top: false,
      bottom: false,
      left: false,
      right: false,
    });
    expect(getSelectionEdgeFlags(2, 3, anchor, focus)).toEqual({
      top: false,
      bottom: true,
      left: false,
      right: true,
    });
    expect(getSelectionEdgeFlags(0, 0, anchor, focus)).toEqual({
      top: false,
      bottom: false,
      left: false,
      right: false,
    });
  });

  it("buildSelectionEdgeShadow combines outer edges", () => {
    const shadow = buildSelectionEdgeShadow({
      top: true,
      bottom: true,
      left: true,
      right: false,
    });
    expect(shadow).toContain("inset 0 2px 0 0");
    expect(shadow).toContain("inset 0 -2px 0 0");
    expect(shadow).toContain("inset 2px 0 0 0");
    expect(shadow).not.toContain("inset -2px");
  });
});
