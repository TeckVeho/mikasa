import { describe, expect, it } from "vitest";
import {
  buildFallbackCallbackNote,
  extractCallbackInfoFromTranscript,
  isCallbackClosingSpoken,
  shouldCreateFallbackCallback,
} from "./callback-fallback.js";

const sampleTranscript = `
お客様: 車検の日程を確認したいです。
AI: かしこまりました。たんとうのものよりおりかえしごれんらくいたします。
お客様: 大正兵法ろあくすです。
AI: たいせーべーほーわーくすさまですね。
お客様: 山田です。
AI: やまださまですね。
お客様: 09028741237です。
AI: 09028741237ですね。
お客様: 4982です。
AI: 4982ですね。
お客様: 9月の20日、10月の3日、10月の23日の3つでお願いします。
お客様: はい、大丈夫です。
AI: かしこまりました。おりかえしのごれんらくをうけたまわりました。おりかえしはよくえいぎょうびになりますので、あらかじめご了承ください。おでんわありがとうございました。
`.trim();

describe("isCallbackClosingSpoken", () => {
  it("detects callback closing utterance", () => {
    expect(isCallbackClosingSpoken(sampleTranscript)).toBe(true);
  });

  it("returns false for hearing-only transcript", () => {
    expect(
      isCallbackClosingSpoken("AI: たんとうのものよりおりかえしごれんらくいたします。"),
    ).toBe(false);
  });
});

describe("shouldCreateFallbackCallback", () => {
  it("returns true when closing spoken but tool was not registered", () => {
    expect(
      shouldCreateFallbackCallback({
        transcript: sampleTranscript,
        wasRegistered: false,
      }),
    ).toBe(true);
  });

  it("returns false when tool was already registered", () => {
    expect(
      shouldCreateFallbackCallback({
        transcript: sampleTranscript,
        wasRegistered: true,
      }),
    ).toBe(false);
  });
});

describe("extractCallbackInfoFromTranscript", () => {
  it("extracts phone, vehicle number, and preferred dates", () => {
    const info = extractCallbackInfoFromTranscript(sampleTranscript);
    expect(info.reason).toBe("車検・日程確認");
    expect(info.callbackNumber).toBe("09028741237");
    expect(info.vehicleNumber).toBe("4982");
    expect(info.preferredDates).toEqual(
      expect.arrayContaining(["9月の20日", "10月の3日", "10月の23日"]),
    );
  });
});

describe("buildFallbackCallbackNote", () => {
  it("includes auto-completion marker", () => {
    const info = extractCallbackInfoFromTranscript(sampleTranscript);
    const note = buildFallbackCallbackNote(sampleTranscript, info);
    expect(note).toContain("自動補完登録");
    expect(note).toContain("09028741237");
  });
});
