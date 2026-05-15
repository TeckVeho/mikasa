import { resolveMockResponse } from "./mock-data";
import { getActingTenantIdForRequest } from "./acting-tenant";

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** シードのデフォルトテナント（[apps/api/prisma/seed.ts](apps/api/prisma/seed.ts) と一致） */
export const DEFAULT_DEV_TENANT_ID = "01HZXEXAMPLE00000000000000";

/**
 * モックの有効判定。
 * - `NEXT_PUBLIC_USE_MOCK=false`（または `0`）→ 常に実 API
 * - `NEXT_PUBLIC_USE_MOCK=true`（または `1`）→ 常にモック
 * - 未設定かつ `NODE_ENV === "development"` → モック（.env を足し忘れても UI 検証できる）
 * - 本番ビルドでは未設定ならモックしない
 */
function shouldUseMock(): boolean {
  if (typeof window !== "undefined") {
    try {
      const o = sessionStorage.getItem("logivoice:useMock");
      if (o === "0") return false;
      if (o === "1") return true;
    } catch {
      /* ignore */
    }
  }

  const v = process.env.NEXT_PUBLIC_USE_MOCK;
  if (v === "false" || v === "0") return false;
  if (v === "true" || v === "1") return true;
  return process.env.NODE_ENV === "development";
}

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message?: string };

function shouldUseDevAuth(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true") return true;
  const host = window.location.hostname;
  return (
    process.env.NODE_ENV === "development" &&
    (host === "localhost" || host === "127.0.0.1")
  );
}

function applyActingTenantHeader(headers: Headers): void {
  const actingTenantId = getActingTenantIdForRequest();
  if (actingTenantId) {
    headers.set("X-Acting-Tenant-Id", actingTenantId);
  }
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  if (shouldUseMock()) {
    const mock = resolveMockResponse<T>(path, init);
    if (mock !== null) return mock;
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (typeof window !== "undefined") {
    // Dev 認証を有効にしているときは Firebase より優先（未登録 UID で 401 になるのを防ぐ）
    if (shouldUseDevAuth()) {
      headers.set(
        "X-Dev-Tenant-Id",
        process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? DEFAULT_DEV_TENANT_ID,
      );
      headers.set(
        "X-Dev-User-Id",
        process.env.NEXT_PUBLIC_DEV_USER_ID ?? "dev-user",
      );
    } else {
      const { getIdToken } = await import("./auth");
      const token = await getIdToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    applyActingTenantHeader(headers);
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      error: "PARSE_ERROR",
      message: `HTTP ${res.status}: レスポンスが JSON ではありません`,
    };
  }

  const parsed = body as ApiEnvelope<T>;
  if (!res.ok && !("ok" in parsed)) {
    return {
      ok: false,
      error: "HTTP_ERROR",
      message: `HTTP ${res.status}`,
    };
  }
  return parsed;
}

/** FormData（ファイルアップロード等）用。Content-Type は自動設定に任せる。 */
export async function apiFormData<T>(
  path: string,
  formData: FormData,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers();

  if (typeof window !== "undefined") {
    if (shouldUseDevAuth()) {
      headers.set(
        "X-Dev-Tenant-Id",
        process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? DEFAULT_DEV_TENANT_ID,
      );
      headers.set(
        "X-Dev-User-Id",
        process.env.NEXT_PUBLIC_DEV_USER_ID ?? "dev-user",
      );
    } else {
      const { getIdToken } = await import("./auth");
      const token = await getIdToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    applyActingTenantHeader(headers);
  }

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: formData,
    cache: "no-store",
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return {
      ok: false,
      error: "PARSE_ERROR",
      message: `HTTP ${res.status}: レスポンスが JSON ではありません`,
    };
  }

  const parsed = body as ApiEnvelope<T>;
  if (!res.ok && !("ok" in parsed)) {
    return {
      ok: false,
      error: "HTTP_ERROR",
      message: `HTTP ${res.status}`,
    };
  }
  return parsed;
}
