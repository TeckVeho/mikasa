import { prisma } from "../lib/prisma.js";
import { summarizeTranscript } from "../lib/openai.js";
import { handleNotify } from "./notify.handler.js";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export async function handleSummarize(payload: {
  tenantId: string;
  callLogId: string;
}): Promise<void> {
  const log = await prisma.callLog.findFirst({
    where: { id: payload.callLogId, tenantId: payload.tenantId },
  });
  if (!log?.transcriptText) {
    logger.warn({ id: payload.callLogId }, "no transcript; skip summarize");
    await sendNotification(payload);
    return;
  }
  let summaryText: string;
  try {
    summaryText = await summarizeTranscript(log.transcriptText);
  } catch (e) {
    logger.warn({ id: log.id, err: e }, "summarize failed");
    await sendNotification(payload);
    return;
  }
  await prisma.callLog.update({
    where: { id: log.id },
    data: { summaryText },
  });
  logger.info({ id: log.id }, "summary saved");

  await sendNotification(payload);
}

async function sendNotification(payload: {
  tenantId: string;
  callLogId: string;
}): Promise<void> {
  try {
    await handleNotify(payload);
  } catch (e) {
    logger.error({ id: payload.callLogId, err: e }, "notification failed");
  }
}
