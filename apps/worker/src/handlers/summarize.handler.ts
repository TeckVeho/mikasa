import { prisma } from "../lib/prisma.js";
import { summarizeTranscript } from "../lib/openai.js";
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
    return;
  }
  const summary = await summarizeTranscript(log.transcriptText);
  await prisma.callLog.update({
    where: { id: log.id },
    data: { summaryText: summary },
  });
  logger.info({ id: log.id }, "summary saved");
}
