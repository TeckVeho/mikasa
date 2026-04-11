export type ExternalApiError =
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "AUTH_ERROR"
  | "UNKNOWN";

export type ExternalApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ExternalApiError; message: string };

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 500,
): Promise<ExternalApiResult<T>> {
  let lastMessage = "";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await fn();
      return { ok: true, data };
    } catch (e) {
      lastMessage = e instanceof Error ? e.message : String(e);
      const msg = lastMessage.toLowerCase();
      if (msg.includes("401") || msg.includes("403")) {
        return { ok: false, error: "AUTH_ERROR", message: lastMessage };
      }
      if (msg.includes("429") || msg.includes("rate")) {
        if (attempt < maxRetries) {
          await sleep(1000);
          continue;
        }
        return { ok: false, error: "RATE_LIMIT", message: lastMessage };
      }
      if (attempt < maxRetries) {
        await sleep(baseDelayMs * 2 ** attempt);
      }
    }
  }
  return { ok: false, error: "UNKNOWN", message: lastMessage };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
