import { describe, expect, it } from "vitest";
import {
  buildBlockDragPayload,
  computeBlockMoveUpdates,
  type BlockDragPayload,
} from "./schedule-grid-clipboard";

const PROCESS_A = "proc-a";
const PROCESS_B = "proc-b";
const DATES = ["2026-07-01", "2026-07-02", "2026-07-03"];

function resolveCell(row: number, col: number) {
  const processTypeId = row < 2 ? PROCESS_A : PROCESS_B;
  const date = DATES[col]!;
  const recordType = row % 2 === 0 ? ("planned" as const) : ("actual" as const);
  return { processTypeId, date, recordType };
}

describe("computeBlockMoveUpdates", () => {
  it("keeps planned moves in planned rows when dropping on an actual row", () => {
    const payload: BlockDragPayload = {
      projectId: "project-1",
      originRow: 0,
      originCol: 0,
      cells: [
        {
          row: 0,
          col: 0,
          processTypeId: PROCESS_A,
          date: DATES[0]!,
          hours: 8,
        },
      ],
    };

    const result = computeBlockMoveUpdates(
      payload,
      1,
      0,
      { rowCount: 4, colCount: 3 },
      resolveCell,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.updates).toEqual([
      {
        processTypeId: PROCESS_A,
        date: DATES[0]!,
        hours: 8,
        recordType: "planned",
      },
    ]);
    expect(result.updates.every((u) => u.recordType === "planned")).toBe(true);
  });

  it("moves planned cells horizontally with planned recordType", () => {
    const payload = buildBlockDragPayload(
      "project-1",
      { row: 0, col: 0 },
      { row: 0, col: 0 },
      (row, col) => {
        const { processTypeId, date } = resolveCell(row, col);
        return { processTypeId, date, hours: 5 };
      },
    );
    expect(payload).not.toBeNull();
    if (!payload) return;

    const result = computeBlockMoveUpdates(
      payload,
      0,
      1,
      { rowCount: 4, colCount: 3 },
      resolveCell,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.updates).toEqual(
      expect.arrayContaining([
        {
          processTypeId: PROCESS_A,
          date: DATES[0]!,
          hours: 0,
          recordType: "planned",
        },
        {
          processTypeId: PROCESS_A,
          date: DATES[1]!,
          hours: 5,
          recordType: "planned",
        },
      ]),
    );
  });
});
