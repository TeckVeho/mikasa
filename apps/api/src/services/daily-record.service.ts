import { Prisma } from "@prisma/client";
import type { Result } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import { toNumber } from "../utils/decimal.js";
import { parseDateOnly, formatDateOnly } from "../utils/date.js";

export async function listDailyRecords(
  tenantId: string,
  filters: { teamId?: string; date?: string; start?: string; end?: string },
) {
  const projects = await prisma.project.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filters.teamId ? { teamId: filters.teamId } : {}),
    },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return [];

  const dateFilter =
    filters.date != null
      ? { date: parseDateOnly(filters.date) }
      : filters.start && filters.end
        ? {
            date: {
              gte: parseDateOnly(filters.start),
              lte: parseDateOnly(filters.end),
            },
          }
        : {};

  const rows = await prisma.processRecord.findMany({
    where: { projectId: { in: projectIds }, ...dateFilter },
    include: {
      processType: true,
      project: { select: { projectNumber: true, projectName: true } },
    },
    orderBy: [{ date: "asc" }, { projectId: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    projectNumber: r.project.projectNumber,
    projectName: r.project.projectName,
    processTypeId: r.processTypeId,
    processTypeName: r.processType.name,
    date: formatDateOnly(r.date),
    hours: toNumber(r.hours) ?? 0,
  }));
}

export async function upsertDailyRecords(
  tenantId: string,
  userId: string,
  records: {
    projectId: string;
    processTypeId: string;
    date: string;
    hours: number;
  }[],
): Promise<Result<{ count: number }>> {
  let count = 0;
  for (const rec of records) {
    const project = await prisma.project.findFirst({
      where: { id: rec.projectId, tenantId, deletedAt: null },
    });
    if (!project) continue;

    const date = parseDateOnly(rec.date);
    await prisma.processRecord.upsert({
      where: {
        projectId_processTypeId_date: {
          projectId: rec.projectId,
          processTypeId: rec.processTypeId,
          date,
        },
      },
      create: {
        id: newId(),
        projectId: rec.projectId,
        processTypeId: rec.processTypeId,
        date,
        hours: new Prisma.Decimal(rec.hours),
        recordedBy: userId,
      },
      update: {
        hours: new Prisma.Decimal(rec.hours),
        recordedBy: userId,
      },
    });
    count++;
  }
  return { ok: true, data: { count } };
}

export function parseDailyRecordsCsv(csv: string): {
  projectNumber: string;
  processName: string;
  date: string;
  hours: number;
}[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim());
  const idx = (name: string) => headers.indexOf(name);

  return lines.slice(1).flatMap((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const hours = Number(cols[idx("hours")] ?? cols[idx("時間")] ?? "0");
    if (!Number.isFinite(hours)) return [];
    return [
      {
        projectNumber: cols[idx("projectNumber")] ?? cols[idx("工番")] ?? "",
        processName: cols[idx("processName")] ?? cols[idx("工程")] ?? "",
        date: cols[idx("date")] ?? cols[idx("日付")] ?? "",
        hours,
      },
    ];
  });
}

export async function importDailyRecordsFromCsv(
  tenantId: string,
  userId: string,
  csv: string,
): Promise<Result<{ count: number; errors: string[] }>> {
  const rows = parseDailyRecordsCsv(csv);
  const processTypes = await prisma.processType.findMany({ where: { tenantId } });
  const processByName = new Map(processTypes.map((p) => [p.name, p.id]));

  const records: {
    projectId: string;
    processTypeId: string;
    date: string;
    hours: number;
  }[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    const project = await prisma.project.findFirst({
      where: { tenantId, projectNumber: row.projectNumber, deletedAt: null },
    });
    if (!project) {
      errors.push(`工番 ${row.projectNumber} が見つかりません`);
      continue;
    }
    const processTypeId = processByName.get(row.processName);
    if (!processTypeId) {
      errors.push(`工程 ${row.processName} が見つかりません`);
      continue;
    }
    records.push({
      projectId: project.id,
      processTypeId,
      date: row.date,
      hours: row.hours,
    });
  }

  const result = await upsertDailyRecords(tenantId, userId, records);
  if (!result.ok) return result;
  return { ok: true, data: { count: result.data.count, errors } };
}
