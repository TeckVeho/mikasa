import WebSocket from "ws";
import { logger } from "./logger.js";
import type { TranscriptSegment } from "@logivoice/shared";

export type AmiVoiceFinalResult = {
  text: string;
  segments: TranscriptSegment[];
};

/** Minimal AmiVoice realtime STT bridge: sends PCM16 8k mono chunks, emits final text (type A). */
export class AmiVoiceSession {
  private ws: WebSocket | null = null;
  private readonly key: string;
  private onFinal?: (result: AmiVoiceFinalResult) => void;

  constructor(appKey: string) {
    this.key = appKey;
  }

  connect(
    onFinal: (result: AmiVoiceFinalResult) => void,
  ): { ok: true } | { ok: false; message: string } {
    const key = process.env.AMIVOICE_APP_KEY ?? this.key;
    if (!key) {
      return { ok: false, message: "AMIVOICE_APP_KEY missing" };
    }
    this.onFinal = onFinal;
    const url = `wss://acp-api.amivoice.com/v1/recognize?u=${encodeURIComponent(key)}&a=-a-general`;
    this.ws = new WebSocket(url);
    this.ws.on("open", () => {
      this.ws?.send("s lsb8k\n");
    });
    this.ws.on("message", (data: WebSocket.RawData) => {
      const str = data.toString();
      try {
        const j = JSON.parse(str) as {
          type?: string;
          text?: string;
          results?: Array<{
            text?: string;
            starttime?: number;
            endtime?: number;
          }>;
        };
        if (j.type === "A" && j.text !== undefined) {
          const segments = parseSegments(j);
          this.onFinal?.({ text: j.text, segments });
        }
      } catch {
        // ignore non-json
      }
    });
    this.ws.on("error", (e) => {
      logger.error({ err: e }, "AmiVoice WS error");
    });
    return { ok: true };
  }

  sendPcmBase64Chunk(base64Pcm: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(`p ${base64Pcm}\n`);
  }

  end(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send("e\n");
    }
    this.ws?.close();
    this.ws = null;
  }
}

function parseSegments(j: {
  text?: string;
  results?: Array<{ text?: string; starttime?: number; endtime?: number }>;
}): TranscriptSegment[] {
  if (Array.isArray(j.results) && j.results.length > 0) {
    return j.results.map((r, i) => {
      const text = r.text ?? "";
      const start =
        typeof r.starttime === "number" ? Math.round(r.starttime * 1000) : i * 500;
      const end =
        typeof r.endtime === "number"
          ? Math.round(r.endtime * 1000)
          : start + Math.max(100, text.length * 80);
      return { startMs: start, endMs: end, text };
    });
  }
  const text = j.text ?? "";
  return [{ startMs: 0, endMs: Math.max(100, text.length * 80), text }];
}
