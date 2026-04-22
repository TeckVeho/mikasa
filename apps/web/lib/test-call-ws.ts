export type TestCallMessage =
  | { type: "audio"; data: string }
  | { type: "transcript"; role: "user" | "model"; text: string }
  | { type: "tool_call"; name: string; args: unknown }
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "error"; message: string }
  | { type: "ended" };

export type TestCallCallbacks = {
  onAudio: (base64Pcm24k: string) => void;
  onTranscript: (role: "user" | "model", text: string) => void;
  onToolCall: (name: string, args: unknown) => void;
  onToolResult: (name: string, result: unknown) => void;
  onError: (message: string) => void;
  onEnded: () => void;
};

function resolveWsUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_WS_URL;
  if (env) return env;

  if (typeof window === "undefined") return "ws://localhost:8080";

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

export class TestCallClient {
  private ws: WebSocket | null = null;

  connect(
    scenarioId: string,
    tenantId: string,
    callbacks: TestCallCallbacks,
  ): void {
    const url = `${resolveWsUrl()}/test-call`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.ws?.send(
        JSON.stringify({ type: "start", scenarioId, tenantId }),
      );
    };

    this.ws.onmessage = (ev: MessageEvent) => {
      let msg: TestCallMessage;
      try {
        msg = JSON.parse(ev.data as string) as TestCallMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case "audio":
          callbacks.onAudio(msg.data);
          break;
        case "transcript":
          callbacks.onTranscript(msg.role, msg.text);
          break;
        case "tool_call":
          callbacks.onToolCall(msg.name, msg.args);
          break;
        case "tool_result":
          callbacks.onToolResult(msg.name, msg.result);
          break;
        case "error":
          callbacks.onError(msg.message);
          break;
        case "ended":
          callbacks.onEnded();
          break;
      }
    };

    this.ws.onerror = () => {
      callbacks.onError("WebSocket 接続エラーが発生しました");
    };

    this.ws.onclose = () => {
      this.ws = null;
    };
  }

  sendAudio(base64Pcm16k: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "audio", data: base64Pcm16k }));
  }

  stop(): void {
    if (!this.ws) return;
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "stop" }));
    }
    this.ws.close();
    this.ws = null;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
