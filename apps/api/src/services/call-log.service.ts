import type { Result } from "@logivoice/shared";
import * as repo from "../repositories/call-log.repo.js";
import { summarizeTranscript } from "../lib/openai.js";
import { prisma } from "../lib/prisma.js";

export async function listCalls(
  tenantId: string,
  query: {
    page: number;
    limit: number;
    from?: string;
    to?: string;
    status?: string;
    numberId?: string;
    q?: string;
  },
): Promise<Result<unknown>> {
  const { items, total } = await repo.findCallLogs(tenantId, {
    page: query.page,
    limit: query.limit,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
    status: query.status,
    numberId: query.numberId,
    q: query.q,
  });
  return {
    ok: true,
    data: {
      items: items.map((c) => ({
        id: c.id,
        callerNumber: c.callerNumber,
        receiverNumberId: c.phoneNumberId,
        duration: c.durationSeconds,
        status: c.status,
        summaryText: c.summaryText,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      limit: query.limit,
    },
  };
}

export async function getCall(
  tenantId: string,
  id: string,
): Promise<Result<unknown>> {
  const c = await repo.findCallLogById(tenantId, id);
  if (!c) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  let audioUrl: string | null = null;
  if (c.audioStoragePath) {
    audioUrl = c.audioStoragePath.startsWith("http")
      ? c.audioStoragePath
      : `gs://${process.env.GCS_BUCKET_NAME ?? "bucket"}/${c.audioStoragePath}`;
  }
  return {
    ok: true,
    data: {
      id: c.id,
      callerNumber: c.callerNumber,
      duration: c.durationSeconds,
      status: c.status,
      transcriptText: c.transcriptText,
      summaryText: c.summaryText,
      structuredData: c.structuredData,
      audioUrl,
      scenarioId: c.scenarioId,
      operatorNote: c.operatorNote,
      createdAt: c.createdAt.toISOString(),
    },
  };
}

export async function updateNote(
  tenantId: string,
  id: string,
  operatorNote: string,
): Promise<Result<unknown>> {
  const n = await repo.updateCallNote(tenantId, id, operatorNote);
  if (n.count === 0) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  return { ok: true, data: true };
}

export async function runSummaryForCall(
  tenantId: string,
  callId: string,
): Promise<Result<unknown>> {
  const c = await prisma.callLog.findFirst({
    where: { id: callId, tenantId },
  });
  if (!c?.transcriptText) {
    return { ok: false, error: "No transcript", code: "NOT_FOUND" };
  }
  const sum = await summarizeTranscript(c.transcriptText);
  if (!sum.ok) return sum;
  await repo.updateCallSummary(tenantId, callId, sum.data);
  return { ok: true, data: { summaryText: sum.data } };
}
