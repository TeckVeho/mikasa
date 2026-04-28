/** シードのデフォルトテナント（[apps/api/prisma/seed.ts] と一致） */
const DEFAULT_DEV_TENANT_ID = "01HZXEXAMPLE00000000000000";

export type TestCallMessage =
  | { type: "ready" }
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

function shouldUseDevAuth(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true") return true;
  const host = window.location.hostname;
  return (
    process.env.NODE_ENV === "development" &&
    (host === "localhost" || host === "127.0.0.1")
  );
}

/**
 * テスト通話 WebSocket。認証は Query（本番: Firebase `token`、開発: `dev_tenant_id`+`dev_user_id`）
 */
export class TestCallClient {
  private ws: WebSocket | null = null;
  private pendingScenarioId: string | null = null;
  private callbacks: TestCallCallbacks | null = null;
  private started = false;

  connect(scenarioId: string, callbacks: TestCallCallbacks): void {
    this.pendingScenarioId = scenarioId;
    this.callbacks = callbacks;
    this.started = false;

    void this.openAndAuth();
  }

  private async openAndAuth(): Promise<void> {
    const base = resolveWsUrl();
    let url = `${base}/test-call`;

    if (shouldUseDevAuth()) {
      const params = new URLSearchParams({
        dev_tenant_id:
          process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? DEFAULT_DEV_TENANT_ID,
        dev_user_id: process.env.NEXT_PUBLIC_DEV_USER_ID ?? "dev-user",
      });
      url += `?${params.toString()}`;
    } else {
      const { getIdToken } = await import("./auth");
      const token = await getIdToken();
      if (!token) {
        this.callbacks?.onError("ログインが必要です");
        return;
      }
      url += `?token=${encodeURIComponent(token)}`;
    }

    this.ws = new WebSocket(url);

    this.ws.onmessage = (ev: MessageEvent) => {
      let msg: TestCallMessage;
      try {
        msg = JSON.parse(ev.data as string) as TestCallMessage;
      } catch {
        return;
      }

      const cb = this.callbacks;
      if (!cb) return;

      if (msg.type === "ready") {
        if (
          this.started ||
          !this.ws ||
          this.ws.readyState !== WebSocket.OPEN ||
          !this.pendingScenarioId
        ) {
          return;
        }
        this.started = true;
        this.ws.send(
          JSON.stringify({
            type: "start",
            scenarioId: this.pendingScenarioId,
          }),
        );
        return;
      }

      switch (msg.type) {
        case "audio":
          cb.onAudio(msg.data);
          break;
        case "transcript":
          cb.onTranscript(msg.role, msg.text);
          break;
        case "tool_call":
          cb.onToolCall(msg.name, msg.args);
          break;
        case "tool_result":
          cb.onToolResult(msg.name, msg.result);
          break;
        case "error":
          cb.onError(msg.message);
          break;
        case "ended":
          cb.onEnded();
          break;
      }
    };

    this.ws.onerror = () => {
      this.callbacks?.onError("WebSocket 接続エラーが発生しました");
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
    this.callbacks = null;
    this.pendingScenarioId = null;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
