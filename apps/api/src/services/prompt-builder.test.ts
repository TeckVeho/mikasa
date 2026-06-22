import { describe, expect, it } from "vitest";
import {
  buildPronunciationDictionarySection,
  buildSystemInstruction,
  buildToolDeclarations,
  stripToolMetadata,
} from "./prompt-builder.js";

describe("stripToolMetadata", () => {
  it("removes dispatch metadata from tool definitions", () => {
    const tool = {
      name: "lookup_invoice",
      description: "test",
      parameters: { type: "OBJECT", properties: {} },
      _endpoint: "https://api.example.com/v1/invoice",
      _method: "POST",
      _headers: { "X-API-Key": "secret" },
      _timeout: 3000,
    };

    expect(stripToolMetadata(tool)).toEqual({
      name: "lookup_invoice",
      description: "test",
      parameters: { type: "OBJECT", properties: {} },
    });
  });
});

describe("buildToolDeclarations", () => {
  it("excludes metadata keys from user tools sent to Gemini", () => {
    const declarations = buildToolDeclarations([
      {
        name: "check_inspection_schedule",
        description: "schedule",
        parameters: { type: "OBJECT", properties: {} },
        _endpoint: "https://api.example.com/v1/schedule",
      },
    ]) as Array<{ name?: string; _endpoint?: string }>;

    const custom = declarations.find(
      (d) => d.name === "check_inspection_schedule",
    );
    expect(custom).toBeDefined();
    expect(custom?._endpoint).toBeUndefined();
    expect(
      declarations.some((d) => d.name === "register_callback"),
    ).toBe(true);
  });
});

describe("buildPronunciationDictionarySection", () => {
  it("returns null for empty entries", () => {
    expect(buildPronunciationDictionarySection([])).toBeNull();
  });

  it("formats entries as do-not-write hints", () => {
    const section = buildPronunciationDictionarySection([
      { word: "承りました", reading: "うけたまわりました" },
    ]);
    expect(section).toContain("**読み方辞書");
    expect(section).toContain(
      "「うけたまわりました」（「承りました」と書かない）",
    );
  });
});

describe("buildSystemInstruction", () => {
  it("includes pronunciation dictionary section when entries are provided", () => {
    const instruction = buildSystemInstruction({
      persona: "test persona",
      conversationRules: "test rules",
      businessKnowledge: "test knowledge",
      guardRails: "test guard",
      toolDefinitions: [],
      voiceName: "Aoede",
      languageCode: "ja-JP",
      tenantName: "Test Tenant",
      callerNumber: "0312345678",
      pronunciationDictionary: [
        { word: "集荷", reading: "しゅうか" },
      ],
    });

    expect(instruction).toContain("**読み方辞書");
    expect(instruction).toContain("「しゅうか」（「集荷」と書かない）");
  });
});
