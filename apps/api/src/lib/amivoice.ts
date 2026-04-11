import WebSocket from "ws";
import { logger } from "./logger.js";

/** Minimal AmiVoice realtime STT bridge: sends PCM16 8k mono chunks, emits final text (type A). */
export class AmiVoiceSession {
  private ws: WebSocket | null = null;
  private readonly key: string;
  private onFinal?: (text: string) => void;

  constructor(appKey: string) {
    this.key = appKey;
  }

  connect(onFinal: (text: string) => void): { ok: true } | { ok: false; message: string } {
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
        const j = JSON.parse(str) as { type?: string; text?: string };
        if (j.type === "A" && j.text) {
          this.onFinal?.(j.text);
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
