import { getCacheJson, setCacheJson } from "../lib/cache.js";

export type TransferInfo = {
  transferNumber: string;
  callerNumber: string;
  timeout: number;
  reason: string;
};

const TRANSFER_TTL_SECONDS = 300;

/** Cache transfer metadata for Twilio webhook (cross Cloud Run instance). */
export async function cacheTransferInfo(
  callSid: string,
  info: TransferInfo,
): Promise<void> {
  await setCacheJson(`transfer:${callSid}`, info, TRANSFER_TTL_SECONDS);
}

export async function getTransferInfo(
  callSid: string,
): Promise<TransferInfo | null> {
  return getCacheJson<TransferInfo>(`transfer:${callSid}`);
}
