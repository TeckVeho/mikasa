import { describe, expect, it } from "vitest";
import { TranscriptAccumulator } from "./transcript-accumulator.js";

describe("TranscriptAccumulator", () => {
  it("merges consecutive chunks from the same role", () => {
    const acc = new TranscriptAccumulator();

    acc.appendChunk("model", "おでんわ");
    acc.appendChunk("model", "ありが");
    acc.appendChunk("model", "とうございます。");
    acc.onTurnComplete();

    expect(acc.finalize().trim()).toBe(
      "AI: おでんわありがとうございます。",
    );
  });

  it("starts a new line when the role changes", () => {
    const acc = new TranscriptAccumulator();

    acc.appendChunk("model", "こんにちは。");
    acc.onTurnComplete();
    acc.appendChunk("user", "車検について");
    acc.appendChunk("user", "聞きたいです。");
    acc.onTurnComplete();

    expect(acc.finalize().trim()).toBe(
      "AI: こんにちは。\nお客様: 車検について聞きたいです。",
    );
  });

  it("exposes buffered text in preview before turn complete", () => {
    const acc = new TranscriptAccumulator();

    acc.appendChunk("model", "かしこまりました。");
    expect(acc.getCommitted()).toBe("");
    expect(acc.getPreview()).toBe("AI: かしこまりました。");

    acc.onTurnComplete();
    expect(acc.getCommitted()).toBe("AI: かしこまりました。\n");
    expect(acc.getPreview()).toBe("AI: かしこまりました。\n");
  });

  it("flushes pending text on finalize for abrupt disconnects", () => {
    const acc = new TranscriptAccumulator();

    acc.appendChunk("user", "はい");
    acc.appendChunk("user", "、大丈夫です。");

    expect(acc.finalize().trim()).toBe("お客様: はい、大丈夫です。");
  });

  it("flushes pending text on turn complete after role switch", () => {
    const acc = new TranscriptAccumulator();

    acc.appendChunk("model", "おりかえしのご");
    acc.appendChunk("model", "れんらくをうけたまわりました。");
    acc.onTurnComplete();

    expect(acc.finalize().trim()).toBe(
      "AI: おりかえしのごれんらくをうけたまわりました。",
    );
  });
});
