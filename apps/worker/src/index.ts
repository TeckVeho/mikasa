import { PubSub } from "@google-cloud/pubsub";
import { createServer } from "node:http";
import pino from "pino";
import { handleSummarize } from "./handlers/summarize.handler.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const subscriptionName =
  process.env.PUBSUB_SUBSCRIPTION_SUMMARIZE ?? "summarize-worker";

function startHealthServer(port: number): void {
  const server = createServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "";
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      (path === "/health" || path === "/")
    ) {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(req.method === "HEAD" ? undefined : "ok");
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.on("error", (e) => {
    logger.error(e);
  });
  server.listen(port, () => {
    logger.info({ port }, "health server listening");
  });
}

async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? 8080);
  startHealthServer(port);

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

  logger.info({ subscriptionName }, "pubsub subscriber ready");
}

void main();
