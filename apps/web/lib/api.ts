import { shouldUseDevAuth } from "./dev-auth";

export { shouldUseDevAuth };

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** シードのデフォルトテナント（apps/api/prisma/seed.ts と一致） */
export const DEFAULT_DEV_TENANT_ID = "01HZXEXAMPLE00000000000000";

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message?: string };


async function applyAuthHeaders(headers: Headers): Promise<void> {
  if (typeof window === "undefined") return;

  if (shouldUseDevAuth()) {
    headers.set(
      "X-Dev-Tenant-Id",
      process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? DEFAULT_DEV_TENANT_ID,
    );
    headers.set(
      "X-Dev-User-Id",
      process.env.NEXT_PUBLIC_DEV_USER_ID ?? "dev-user",
    );
    return;
  }

  const { getIdToken } = await import("./auth");
  const token = await getIdToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  await applyAuthHeaders(headers);

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

export async function apiFormData<T>(
  path: string,
  formData: FormData,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers();
  await applyAuthHeaders(headers);

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
