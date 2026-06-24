import { describe, expect, it } from "vitest";
import {
  buildFallbackCallbackNote,
  extractCallbackInfoFromTranscript,
  hasCallbackProgressSignal,
  isCallbackClosingSpoken,
  mentionsCallbackFlow,
  shouldCreateFallbackCallback,
  stripSpeakerPrefixes,
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

const chunkedClosingTranscript = `
お客様: はい。大丈夫です。
AI: かしこまりました。おりかえしのご
AI: れんらくをうけたまわりました。おりかえしはよくえいぎょうびになりますので、あらかじめご了承ください。
`.trim();

const hearingOnlyTranscript =
  "AI: たんとうのものよりおりかえしごれんらくいたします。";

const hearingWithPhoneTranscript = `
AI: たんとうのものよりおりかえしごれんらくいたします。
お客様: 09094337901
`.trim();

describe("stripSpeakerPrefixes", () => {
  it("removes speaker labels and joins chunks", () => {
    expect(stripSpeakerPrefixes(chunkedClosingTranscript)).toBe(
      "はい。大丈夫です。かしこまりました。おりかえしのごれんらくをうけたまわりました。おりかえしはよくえいぎょうびになりますので、あらかじめご了承ください。",
    );
  });
});

describe("isCallbackClosingSpoken", () => {
  it("detects callback closing utterance", () => {
    expect(isCallbackClosingSpoken(sampleTranscript)).toBe(true);
  });

  it("detects closing even when split across AI chunks", () => {
    expect(isCallbackClosingSpoken(chunkedClosingTranscript)).toBe(true);
  });

  it("returns false for hearing-only transcript", () => {
    expect(isCallbackClosingSpoken(hearingOnlyTranscript)).toBe(false);
  });
});

describe("mentionsCallbackFlow", () => {
  it("detects おりかえし in hearing phase", () => {
    expect(mentionsCallbackFlow(hearingOnlyTranscript)).toBe(true);
  });
});

describe("hasCallbackProgressSignal", () => {
  it("detects phone number in user lines", () => {
    expect(hasCallbackProgressSignal(hearingWithPhoneTranscript)).toBe(true);
  });

  it("returns false for hearing-only opening", () => {
    expect(hasCallbackProgressSignal(hearingOnlyTranscript)).toBe(false);
  });

  it("detects final confirmation agreement", () => {
    expect(hasCallbackProgressSignal(sampleTranscript)).toBe(true);
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

  it("returns true for chunked closing transcript", () => {
    expect(
      shouldCreateFallbackCallback({
        transcript: chunkedClosingTranscript,
        wasRegistered: false,
      }),
    ).toBe(true);
  });

  it("returns true when hearing progressed with phone number", () => {
    expect(
      shouldCreateFallbackCallback({
        transcript: hearingWithPhoneTranscript,
        wasRegistered: false,
      }),
    ).toBe(true);
  });

  it("returns false for hearing-only opening", () => {
    expect(
      shouldCreateFallbackCallback({
        transcript: hearingOnlyTranscript,
        wasRegistered: false,
      }),
    ).toBe(false);
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
