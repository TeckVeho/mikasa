import { PubSub } from "@google-cloud/pubsub";
import { logger } from "./logger.js";

let client: PubSub | null = null;

function getPubSub(): PubSub | null {
  if (!process.env.GOOGLE_CLOUD_PROJECT) return null;
  if (!client) client = new PubSub();
  return client;
}

export async function publishCallCompleted(payload: {
  tenantId: string;
  callLogId: string;
}): Promise<void> {
  const topicName = process.env.PUBSUB_TOPIC_CALL_COMPLETED ?? "call-completed";
  const ps = getPubSub();
  if (!ps) {
    logger.warn("Pub/Sub not configured; skip publish");
    return;
  }
  const topic = ps.topic(topicName);
  await topic.publishMessage({ json: payload });
}
