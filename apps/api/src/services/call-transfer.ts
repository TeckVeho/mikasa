import { getRedis } from "../lib/redis.js";

export type TransferInfo = {
  transferNumber: string;
  callerNumber: string;
  timeout: number;
  reason: string;
};

/** 転送情報を Redis にキャッシュ（Webhook で参照） */
export async function cacheTransferInfo(
  callSid: string,
  info: TransferInfo,
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(`transfer:${callSid}`, JSON.stringify(info), "EX", 300);
  }
}

/** Redis から転送情報を取得 */
export async function getTransferInfo(
  callSid: string,
): Promise<TransferInfo | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(`transfer:${callSid}`);
  if (!raw) return null;
  return JSON.parse(raw) as TransferInfo;
}
