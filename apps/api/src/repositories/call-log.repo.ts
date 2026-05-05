import { prisma } from "../lib/prisma.js";
import type { Prisma } from "@prisma/client";

export async function findCallLogs(
  tenantId: string,
  opts: {
    page: number;
    limit: number;
    from?: Date;
    to?: Date;
    status?: string;
    numberId?: string;
    q?: string;
  },
) {
  const where: Prisma.CallLogWhereInput = {
    tenantId,
    ...(opts.from || opts.to
      ? {
          createdAt: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.numberId ? { phoneNumberId: opts.numberId } : {}),
    ...(opts.q
      ? {
          transcriptText: { contains: opts.q },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
      include: {
        phoneNumber: true,
      },
    }),
    prisma.callLog.count({ where }),
  ]);

  return { items, total };
}

export async function findCallLogById(tenantId: string, id: string) {
  return prisma.callLog.findFirst({
    where: { id, tenantId },
    include: { phoneNumber: true, scenario: true },
  });
}

export async function upsertCallLogByTwilioSid(data: {
  id: string;
  tenantId: string;
  phoneNumberId: string;
  scenarioId: string;
  twilioCallSid: string;
  callerNumber: string;
  status: string;
  transcriptText?: string | null;
  transcriptSegments?: Prisma.InputJsonValue | null;
  durationSeconds?: number | null;
  structuredData?: Prisma.InputJsonValue | null;
  audioStoragePath?: string | null;
}) {
  return prisma.callLog.upsert({
    where: { twilioCallSid: data.twilioCallSid },
    create: {
      ...data,
      operatorNote: "",
      structuredData:
        data.structuredData === null || data.structuredData === undefined
          ? undefined
          : data.structuredData,
      transcriptSegments:
        data.transcriptSegments === null || data.transcriptSegments === undefined
          ? undefined
          : data.transcriptSegments,
    },
    update: {
      status: data.status,
      transcriptText: data.transcriptText,
      transcriptSegments: data.transcriptSegments ?? undefined,
      durationSeconds: data.durationSeconds,
      structuredData: data.structuredData ?? undefined,
      audioStoragePath: data.audioStoragePath ?? undefined,
    },
  });
}

export async function updateCallNote(
  tenantId: string,
  id: string,
  patch: { operatorNote?: string; callbackDone?: boolean },
) {
  const data: Prisma.CallLogUpdateManyMutationInput = {};
  if (patch.operatorNote !== undefined) data.operatorNote = patch.operatorNote;
  if (patch.callbackDone !== undefined) data.callbackDone = patch.callbackDone;
  return prisma.callLog.updateMany({
    where: { id, tenantId },
    data,
  });
}

export async function updateCallSummary(
  tenantId: string,
  id: string,
  summaryText: string,
) {
  return prisma.callLog.updateMany({
    where: { id, tenantId },
    data: { summaryText },
  });
}
