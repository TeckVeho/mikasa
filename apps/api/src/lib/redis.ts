import { Redis } from "ioredis";
import { logger } from "./logger.js";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn("REDIS_URL not set; session features disabled");
    return null;
  }
  if (!client) {
    client = new Redis(url, { maxRetriesPerRequest: 3 });
  }
  return client;
}

export async function getSessionJson<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  const raw = await r.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function setSessionJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function deleteSessionKey(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(key);
}
