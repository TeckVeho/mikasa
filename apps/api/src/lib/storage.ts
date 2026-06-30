import { Storage } from "@google-cloud/storage";
import { logger } from "./logger.js";

const TTS_CACHE_PREFIX = "tts-cache/";

let storageClient: Storage | null = null;

function getStorage(): Storage | null {
  const bucket = process.env.GCS_BUCKET_NAME ?? process.env.GCS_BUCKET;
  if (!bucket) return null;
  if (!storageClient) {
    try {
      storageClient = new Storage();
    } catch (e) {
      logger.warn({ err: e }, "GCS Storage client init failed");
      return null;
    }
  }
  return storageClient;
}

function ttsCacheObjectPath(hash: string): string {
  return `${TTS_CACHE_PREFIX}${hash}.pcm`;
}

/** Read cached LINEAR16 8kHz PCM from GCS (lifecycle deletes after 1 day). */
export async function getTtsCache(hash: string): Promise<Buffer | null> {
  const bucketName = process.env.GCS_BUCKET_NAME ?? process.env.GCS_BUCKET;
  if (!bucketName) return null;
  const s = getStorage();
  if (!s) return null;
  const objectPath = ttsCacheObjectPath(hash);
  try {
    const file = s.bucket(bucketName).file(objectPath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [data] = await file.download();
    return data;
  } catch (e) {
    logger.debug({ err: e, objectPath }, "getTtsCache miss or error");
    return null;
  }
}

export async function putTtsCache(hash: string, data: Buffer): Promise<void> {
  const bucketName = process.env.GCS_BUCKET_NAME ?? process.env.GCS_BUCKET;
  if (!bucketName) return;
  const s = getStorage();
  if (!s) return;
  const objectPath = ttsCacheObjectPath(hash);
  try {
    await s.bucket(bucketName).file(objectPath).save(data, {
      contentType: "audio/l16",
      resumable: false,
    });
  } catch (e) {
    logger.warn({ err: e, objectPath }, "putTtsCache failed");
  }
}

/**
 * Upload call recording WAV bytes. Returns object path (not gs:// URL) for DB storage.
 */
export async function uploadCallRecording(
  tenantId: string,
  callLogId: string,
  data: Buffer,
  contentType = "audio/wav",
): Promise<string | null> {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    logger.debug("GCS_BUCKET_NAME not set; skip recording upload");
    return null;
  }
  const s = getStorage();
  if (!s) return null;
  const objectPath = `recordings/${tenantId}/${callLogId}.wav`;
  try {
    const bucket = s.bucket(bucketName);
    await bucket.file(objectPath).save(data, {
      contentType,
      resumable: false,
    });
    return objectPath;
  } catch (e) {
    logger.error({ err: e, objectPath }, "uploadCallRecording failed");
    return null;
  }
}

/** v4 signed read URL for a stored object path (same bucket). */
export async function getSignedUrlForRecording(
  objectPath: string,
  expiresMs = 60 * 60 * 1000,
): Promise<string | null> {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) return null;
  const s = getStorage();
  if (!s) return null;
  try {
    const [url] = await s.bucket(bucketName).file(objectPath).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresMs,
    });
    return url;
  } catch (e) {
    logger.error({ err: e, objectPath }, "getSignedUrlForRecording failed");
    return null;
  }
}
