import type { Decimal } from "@prisma/client/runtime/library";

export function toNumber(value: Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  return value.toNumber();
}

export function roundHours(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
