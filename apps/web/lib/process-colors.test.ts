import { describe, expect, it } from "vitest";
import {
  getProcessRowColors,
  PROCESS_TYPE_ROW_COLORS,
  resolveProcessColumnName,
} from "./process-colors";

describe("process-colors", () => {
  it("resolveProcessColumnName", () => {
    expect(resolveProcessColumnName("溶接")).toBe("溶接");
    expect(resolveProcessColumnName("歪取")).toBe("歪取り");
    expect(resolveProcessColumnName("unknown")).toBeNull();
  });

  it("getProcessRowColors returns distinct colors per process", () => {
    const prep = getProcessRowColors("組立前");
    const weld = getProcessRowColors("溶接");
    expect(prep.cell).not.toBe(weld.cell);
    expect(prep).toEqual(PROCESS_TYPE_ROW_COLORS["組立前"]);
  });

  it("getProcessRowColors falls back for unknown process", () => {
    const colors = getProcessRowColors("その他");
    expect(colors.cell).toContain("emerald");
  });
});
