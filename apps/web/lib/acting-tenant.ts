const STORAGE_KEY = "logivoice:acting-tenant-id";

/** Chỉ superadmin mới được gửi header/query acting tenant (set từ ActingTenantContext). */
let actingTenantHeaderEnabled = false;

export function setActingTenantHeaderEnabled(enabled: boolean): void {
  actingTenantHeaderEnabled = enabled;
}

export function getActingTenantIdForRequest(): string | null {
  if (!actingTenantHeaderEnabled) return null;
  return getActingTenantId();
}

export function getActingTenantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActingTenantId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearActingTenantId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
