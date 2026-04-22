import { Storage } from "@google-cloud/storage";
import { logger } from "./logger.js";

let storageClient: Storage | null = null;

function getStorage(): Storage | null {
  const bucket = process.env.GCS_BUCKET_NAME;
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
