import { prisma } from "../lib/prisma.js";
import { sendEmail } from "../lib/email.js";
import { buildSubject, buildHtml, type CallEmailData } from "../lib/email-template.js";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export async function handleNotify(payload: {
  tenantId: string;
  callLogId: string;
}): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: payload.tenantId },
    select: {
      name: true,
      notifyCallComplete: true,
      notifyTransfer: true,
      notifyEmail: true,
    },
  });

  if (!tenant?.notifyEmail) {
    logger.debug({ id: payload.callLogId }, "no notify email configured; skip");
    return;
  }

  const log = await prisma.callLog.findFirst({
    where: { id: payload.callLogId, tenantId: payload.tenantId },
    include: {
      phoneNumber: { select: { number: true } },
      scenario: { select: { name: true } },
      transferHandoffs: {
        select: { department: true, reason: true, priority: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!log) {
    logger.warn({ id: payload.callLogId }, "call log not found; skip notify");
    return;
  }

  const isTransferred = log.status === "transferred";
  const shouldNotify =
    (tenant.notifyCallComplete && !isTransferred) ||
    (tenant.notifyTransfer && isTransferred);

  if (!shouldNotify) {
    logger.debug(
      { id: log.id, status: log.status },
      "notification not enabled for this status; skip",
    );
    return;
  }

  const transfer = log.transferHandoffs[0] ?? null;

  const dashboardBase = process.env.DASHBOARD_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const dashboardUrl = dashboardBase
    ? `${dashboardBase.replace(/\/+$/, "")}/calls/${log.id}`
    : undefined;

  const data: CallEmailData = {
    callerNumber: log.callerNumber,
    phoneNumber: log.phoneNumber.number,
    scenarioName: log.scenario.name,
    status: log.status,
    durationSeconds: log.durationSeconds,
    summaryText: log.summaryText,
    transcriptText: log.transcriptText,
    createdAt: log.createdAt,
    transfer: transfer
      ? {
          department: transfer.department,
          reason: transfer.reason,
          priority: transfer.priority,
        }
      : null,
    dashboardUrl,
  };

  const subject = buildSubject(data);
  const html = buildHtml(data);

  await sendEmail({ to: tenant.notifyEmail, subject, html });
}
