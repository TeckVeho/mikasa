import { describe, expect, it } from "vitest";
import {
  formatProcessAbbrev,
  formatProcessSegmentLabel,
} from "./process-colors";

describe("formatProcessAbbrev", () => {
  it("returns Excel-style abbreviations for known processes", () => {
    expect(formatProcessAbbrev("組立前")).toBe("組前");
    expect(formatProcessAbbrev("組立")).toBe("組");
    expect(formatProcessAbbrev("溶接")).toBe("溶");
    expect(formatProcessAbbrev("歪取り")).toBe("歪");
    expect(formatProcessAbbrev("塗装")).toBe("塗");
    expect(formatProcessAbbrev("仕上げ")).toBe("仕");
  });

  it("falls back to first two characters for unknown processes", () => {
    expect(formatProcessAbbrev("検査")).toBe("検査");
  });
});

describe("formatProcessSegmentLabel", () => {
  it("combines abbrev and hours", () => {
    expect(formatProcessSegmentLabel("組立", 4)).toBe("組4");
    expect(formatProcessSegmentLabel("溶接", "")).toBe("");
  });
});
