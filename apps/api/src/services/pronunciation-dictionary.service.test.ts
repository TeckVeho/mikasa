import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    speechDictionary: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma.js";
import {
  getBuiltInPronunciationEntries,
  getPronunciationDictionary,
} from "./pronunciation-dictionary.service.js";

describe("getPronunciationDictionary", () => {
  beforeEach(() => {
    vi.mocked(prisma.speechDictionary.findMany).mockReset();
  });

  it("merges built-in entries with tenant-specific overrides", async () => {
    vi.mocked(prisma.speechDictionary.findMany).mockResolvedValue([
      {
        word: "承りました",
        reading: "カスタムよみ",
        category: "custom",
      },
      {
        word: "Impliq",
        reading: "いんぷりっく",
        category: "company",
      },
    ]);

    const entries = await getPronunciationDictionary("tenant-1");

    expect(entries.find((e) => e.word === "承りました")?.reading).toBe(
      "カスタムよみ",
    );
    expect(entries.find((e) => e.word === "Impliq")?.reading).toBe(
      "いんぷりっく",
    );
    expect(entries.find((e) => e.word === "集荷")?.reading).toBe("しゅうか");
  });

  it("includes built-in entries when tenant dictionary is empty", async () => {
    vi.mocked(prisma.speechDictionary.findMany).mockResolvedValue([]);

    const entries = await getPronunciationDictionary("tenant-1");

    expect(entries.length).toBe(getBuiltInPronunciationEntries().length);
    expect(entries.some((e) => e.word === "承知しました")).toBe(true);
  });
});
