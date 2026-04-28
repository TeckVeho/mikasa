import { createHmac, timingSafeEqual } from "node:crypto";

const VERSION = "v1";

export type FormTokenPayload = {
  callLogId: string;
  tenantId: string;
  exp: number;
};

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function getSecret(): string {
  const s = process.env.FORM_TOKEN_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-form-token-secret-change-me";
  }
  throw new Error("FORM_TOKEN_SECRET is required in production (min 16 chars)");
}

/** Create a signed public form access token. Default TTL: 90 days. */
export function signFormAccessToken(
  callLogId: string,
  tenantId: string,
  ttlMs = 90 * 24 * 60 * 60 * 1000,
): string {
  const exp = Date.now() + ttlMs;
  const payload: FormTokenPayload = { callLogId, tenantId, exp };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(Buffer.from(payloadJson, "utf8"));
  const h = createHmac("sha256", getSecret());
  h.update(`${VERSION}:${payloadB64}`);
  const sig = base64UrlEncode(h.digest());
  return `${VERSION}.${payloadB64}.${sig}`;
}

export function verifyFormAccessToken(
  token: string,
):
  | { ok: true; payload: FormTokenPayload }
  | { ok: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) {
    return { ok: false, error: "INVALID_TOKEN" };
  }
  const [, payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return { ok: false, error: "INVALID_TOKEN" };

  const h = createHmac("sha256", getSecret());
  h.update(`${VERSION}:${payloadB64}`);
  const expectedDigest = h.digest();

  let providedDigest: Buffer;
  try {
    providedDigest = base64UrlDecode(sig);
  } catch {
    return { ok: false, error: "INVALID_SIGNATURE" };
  }
  if (
    providedDigest.length !== expectedDigest.length ||
    !timingSafeEqual(providedDigest, expectedDigest)
  ) {
    return { ok: false, error: "INVALID_SIGNATURE" };
  }

  let payload: FormTokenPayload;
  try {
    payload = JSON.parse(
      base64UrlDecode(payloadB64).toString("utf8"),
    ) as FormTokenPayload;
  } catch {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  if (
    typeof payload.callLogId !== "string" ||
    typeof payload.tenantId !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }

  if (Date.now() > payload.exp) {
    return { ok: false, error: "TOKEN_EXPIRED" };
  }

  return { ok: true, payload };
}
