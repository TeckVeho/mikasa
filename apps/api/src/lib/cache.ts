import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

/** Probabilistic cleanup of expired rows (~1% of writes). */
function maybePurgeExpired(): void {
  if (Math.random() >= 0.01) return;
  void prisma.kvCache
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch((err) => logger.debug({ err }, "kv_cache purge skipped"));
}

export async function getCacheJson<T>(key: string): Promise<T | null> {
  try {
    const row = await prisma.kvCache.findFirst({
      where: { cacheKey: key, expiresAt: { gt: new Date() } },
    });
    if (!row) return null;
    return JSON.parse(row.value) as T;
  } catch (err) {
    logger.warn({ err, key }, "kv_cache get failed");
    return null;
  }
}

export async function setCacheJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const payload = JSON.stringify(value);
  try {
    await prisma.kvCache.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, value: payload, expiresAt },
      update: { value: payload, expiresAt },
    });
    maybePurgeExpired();
  } catch (err) {
    logger.warn({ err, key }, "kv_cache set failed");
  }
}

export async function deleteCacheKey(key: string): Promise<void> {
  try {
    await prisma.kvCache.deleteMany({ where: { cacheKey: key } });
  } catch (err) {
    logger.warn({ err, key }, "kv_cache delete failed");
  }
}
