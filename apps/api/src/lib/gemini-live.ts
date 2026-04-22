import WebSocket from "ws";
import { logger } from "./logger.js";

export type GeminiLiveConfig = {
  apiKey: string;
  model: string;
  systemInstruction: string;
  tools: unknown[];
  voice: string;
  languageCode: string;
};

export type GeminiLiveCallbacks = {
  onAudio: (pcm24kChunk: Buffer) => void;
  onTranscript: (role: "user" | "model", text: string) => void;
  onToolCall: (
    id: string,
    name: string,
    args: Record<string, unknown>,
  ) => void;
  onTurnComplete: () => void;
  onError: (err: Error) => void;
  onClose: () => void;
};

/* ------------------------------------------------------------------ */
/*  Gemini Live API message shapes (subset)                           */
/* ------------------------------------------------------------------ */

type InlineData = { mimeType: string; data: string };

type Part = {
  text?: string;
  inlineData?: InlineData;
};

type ServerContent = {
  modelTurn?: { parts?: Part[] };
  inputTranscription?: { text?: string };
  outputTranscription?: { text?: string };
  turnComplete?: boolean;
  interrupted?: boolean;
};

type FunctionCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

type ToolCallMessage = {
  functionCalls: FunctionCall[];
};

type GeminiMessage = {
  serverContent?: ServerContent;
  toolCall?: ToolCallMessage;
  sessionResumptionUpdate?: { newHandle?: string };
  goAway?: unknown;
};

/* ------------------------------------------------------------------ */
/*  GeminiLiveSession                                                 */
/* ------------------------------------------------------------------ */

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private callbacks: GeminiLiveCallbacks | null = null;
  private sessionHandle: string | null = null;

  /** Gemini Live API に接続してセッションを確立 */
  connect(config: GeminiLiveConfig, callbacks: GeminiLiveCallbacks): void {
    this.callbacks = callbacks;

    const url =
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${config.apiKey}`;

    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      logger.info("Gemini Live WS connected");
      this.sendSetup(config);
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      this.handleMessage(data);
    });

    this.ws.on("error", (err) => {
      logger.error({ err }, "Gemini Live WS error");
      this.callbacks?.onError(
        err instanceof Error ? err : new Error(String(err)),
      );
    });

    this.ws.on("close", () => {
      logger.info("Gemini Live WS closed");
      this.ws = null;
      this.callbacks?.onClose();
    });
  }

  /** PCM16 16 kHz 音声チャンクを Gemini に送信 */
  sendAudio(pcm16kChunk: Buffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          audio: {
            data: pcm16kChunk.toString("base64"),
            mimeType: "audio/pcm;rate=16000",
          },
        },
      }),
    );
  }

  /** テキストを Gemini に送信（DTMF 結果の注入等に使用） */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        realtimeInput: { text },
      }),
    );
  }

  /** function calling の結果を Gemini に返す */
  sendToolResult(callId: string, result: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        toolResponse: {
          functionResponses: [
            {
              id: callId,
              response: result,
            },
          ],
        },
      }),
    );
  }

  /** セッションを終了 */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** セッションが接続中かどうか */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /* ---------------------------------------------------------------- */
  /*  private helpers                                                  */
  /* ---------------------------------------------------------------- */

  private sendSetup(config: GeminiLiveConfig): void {
    const setup = {
      setup: {
        model: config.model,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: config.voice },
            },
            languageCode: config.languageCode,
          },
        },
        systemInstruction: {
          parts: [{ text: config.systemInstruction }],
        },
        tools: config.tools,
        sessionResumption: { transparent: true },
        inputAudioTranscription: { languageCodes: [config.languageCode] },
        outputAudioTranscription: { languageCodes: [config.languageCode] },
        contextWindowCompression: {
          triggerTokens: 100_000,
          slidingWindow: { targetTokens: 4_000 },
        },
      },
    };

    this.ws!.send(JSON.stringify(setup));
  }

  private handleMessage(raw: WebSocket.RawData): void {
    let msg: GeminiMessage;
    try {
      msg = JSON.parse(raw.toString()) as GeminiMessage;
    } catch {
      logger.warn("Gemini Live: failed to parse incoming message");
      return;
    }

    if (msg.sessionResumptionUpdate?.newHandle) {
      this.sessionHandle = msg.sessionResumptionUpdate.newHandle;
      logger.debug(
        { handle: this.sessionHandle },
        "Gemini session handle updated",
      );
    }

    if (msg.goAway) {
      logger.warn("Gemini Live: goAway received, prepare to reconnect");
    }

    const sc = msg.serverContent;
    if (sc) {
      if (sc.interrupted) {
        logger.debug("Gemini Live: barge-in interrupted");
      }

      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.data) {
            const pcm = Buffer.from(part.inlineData.data, "base64");
            this.callbacks?.onAudio(pcm);
          }
          if (part.text) {
            this.callbacks?.onTranscript("model", part.text);
          }
        }
      }

      if (sc.inputTranscription?.text) {
        this.callbacks?.onTranscript("user", sc.inputTranscription.text);
      }

      if (sc.outputTranscription?.text) {
        this.callbacks?.onTranscript("model", sc.outputTranscription.text);
      }

      if (sc.turnComplete) {
        this.callbacks?.onTurnComplete();
      }
    }

    if (msg.toolCall?.functionCalls) {
      for (const fc of msg.toolCall.functionCalls) {
        this.callbacks?.onToolCall(fc.id, fc.name, fc.args);
      }
    }
  }
}
