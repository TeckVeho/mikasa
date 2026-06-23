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
  /** @param resumed true when the session was restored after reconnect */
  onSetupComplete?: (resumed: boolean) => void;
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

type SessionResumptionUpdate = {
  newHandle?: string;
  resumable?: boolean;
};

type GeminiMessage = {
  setupComplete?: unknown;
  serverContent?: ServerContent;
  toolCall?: ToolCallMessage;
  goAway?: { timeLeft?: string };
  sessionResumptionUpdate?: SessionResumptionUpdate;
};

/* ------------------------------------------------------------------ */
/*  GeminiLiveSession                                                 */
/* ------------------------------------------------------------------ */

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private config: GeminiLiveConfig | null = null;
  private callbacks: GeminiLiveCallbacks | null = null;
  private resumptionHandle: string | null = null;
  private intentionalClose = false;
  private closingForReconnect = false;
  private isResuming = false;
  private connectionId = 0;

  /** Gemini Live API に接続してセッションを確立 */
  connect(config: GeminiLiveConfig, callbacks: GeminiLiveCallbacks): void {
    this.config = config;
    this.callbacks = callbacks;
    this.intentionalClose = false;
    this.resumptionHandle = null;
    this.isResuming = false;
    this.openConnection();
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

  /** 初期ターンを送信して Gemini に最初の発話を促す */
  sendInitialTurn(
    prompt = "通話が接続されました。あいさつして、すぐにご用件をお伺いしてください。",
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      realtimeInput: { text: prompt },
    }));
  }

  /** セッションを終了 */
  close(): void {
    this.intentionalClose = true;
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

  private openConnection(): void {
    if (!this.config || !this.callbacks) return;

    const apiKey = this.config.apiKey.trim();
    if (!apiKey) {
      const err = new Error(
        "GEMINI_API_KEY が未設定です。apps/api/.env またはルート .env に GEMINI_API_KEY を設定してください。",
      );
      logger.error("Gemini Live: missing API key");
      this.callbacks.onError(err);
      return;
    }

    const connId = ++this.connectionId;
    const url =
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.on("open", () => {
      if (connId !== this.connectionId) return;
      logger.info(
        { resumed: this.isResuming },
        "Gemini Live WS connected",
      );
      this.sendSetup(this.config!);
    });

    ws.on("message", (data: WebSocket.RawData) => {
      if (connId !== this.connectionId) return;
      this.handleMessage(data);
    });

    ws.on("error", (err) => {
      if (connId !== this.connectionId) return;
      logger.error({ err }, "Gemini Live WS error");
      this.callbacks?.onError(
        err instanceof Error ? err : new Error(String(err)),
      );
    });

    ws.on("close", (code: number, reason: Buffer) => {
      if (connId !== this.connectionId) return;
      this.handleWsClose(code, reason);
    });
  }

  private handleWsClose(code: number, reason: Buffer): void {
    this.ws = null;
    const reasonStr = reason?.toString() || "";

    if (this.intentionalClose) {
      logger.info({ code, reason: reasonStr }, "Gemini Live WS closed");
      this.callbacks?.onClose();
      return;
    }

    if (this.closingForReconnect) {
      return;
    }

    if (this.resumptionHandle && this.config) {
      logger.warn(
        { code, reason: reasonStr },
        "Gemini Live: connection lost, reconnecting with session resumption",
      );
      this.reconnect();
      return;
    }

    if (code !== 1000 && code !== 1001) {
      logger.error({ code, reason: reasonStr }, "Gemini Live WS closed with error");
      this.callbacks?.onError(
        new Error(`Gemini Live 接続エラー (code=${code}): ${reasonStr || "不明なエラー"}`),
      );
    } else {
      logger.info({ code, reason: reasonStr }, "Gemini Live WS closed");
    }
    this.callbacks?.onClose();
  }

  private reconnect(): void {
    if (this.intentionalClose || !this.config || !this.resumptionHandle) return;
    this.closingForReconnect = true;
    this.isResuming = true;
    this.openConnection();
    this.closingForReconnect = false;
  }

  private reconnectOnGoAway(): void {
    if (this.intentionalClose || !this.resumptionHandle || !this.config) return;
    logger.warn("Gemini Live: goAway received, proactively reconnecting");
    this.closingForReconnect = true;
    const oldWs = this.ws;
    this.ws = null;
    oldWs?.close(1000);
    this.isResuming = true;
    this.openConnection();
    this.closingForReconnect = false;
  }

  private sendSetup(config: GeminiLiveConfig): void {
    const sessionResumption = this.resumptionHandle
      ? { handle: this.resumptionHandle }
      : {};

    const setup = {
      setup: {
        model: config.model.startsWith("models/") ? config.model : `models/${config.model}`,
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
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        sessionResumption,
        contextWindowCompression: {
          slidingWindow: {},
        },
      },
    };

    logger.debug(
      { toolCount: config.tools?.[0] && typeof config.tools[0] === "object"
          ? (config.tools[0] as Record<string, unknown[]>).functionDeclarations?.length ?? 0
          : 0,
        resumed: this.isResuming,
      },
      "Gemini Live setup: sending tools",
    );

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

    if (msg.setupComplete) {
      logger.info({ resumed: this.isResuming }, "Gemini Live setup complete");
      const resumed = this.isResuming;
      this.isResuming = false;
      this.callbacks?.onSetupComplete?.(resumed);
      return;
    }

    if (msg.sessionResumptionUpdate) {
      const update = msg.sessionResumptionUpdate;
      if (update.resumable && update.newHandle) {
        this.resumptionHandle = update.newHandle;
        logger.debug("Gemini Live: stored session resumption handle");
      }
    }

    if (msg.goAway) {
      logger.warn({ goAway: msg.goAway }, "Gemini Live: goAway received");
      this.reconnectOnGoAway();
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
        logger.info({ toolName: fc.name, args: fc.args }, "Gemini Live: tool call received");
        this.callbacks?.onToolCall(fc.id, fc.name, fc.args);
      }
    }
  }
}
