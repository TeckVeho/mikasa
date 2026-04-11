import { PubSub } from "@google-cloud/pubsub";
import pino from "pino";
import { handleSummarize } from "./handlers/summarize.handler.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const subscriptionName =
  process.env.PUBSUB_SUBSCRIPTION_SUMMARIZE ?? "summarize-worker";

async function main(): Promise<void> {
  if (!projectId) {
    logger.warn("GOOGLE_CLOUD_PROJECT not set; worker idle (dev mode)");
    return;
  }
  const pubsub = new PubSub({ projectId });
  const sub = pubsub.subscription(subscriptionName);

  sub.on("message", (msg) => {
    void (async () => {
      try {
        const payload = JSON.parse(msg.data.toString()) as {
          tenantId: string;
          callLogId: string;
        };
        await handleSummarize(payload);
        msg.ack();
      } catch (e) {
        logger.error(e);
        msg.nack();
      }
    })();
  });

  sub.on("error", (e) => {
    logger.error(e);
  });

  logger.info({ subscriptionName }, "worker listening");
}

void main();
