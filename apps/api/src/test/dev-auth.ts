import { TENANT_ID } from "./fixtures.js";

export function devAuthHeaders(userId = "dev-user"): Record<string, string> {
  return {
    "x-dev-tenant-id": TENANT_ID,
    "x-dev-user-id": userId,
  };
}
