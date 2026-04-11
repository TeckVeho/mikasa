export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: string; message?: string };
