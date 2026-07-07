import { Prisma } from "@prisma/client";
import type { Result } from "@logivoice/shared";
import { parseProcessRatios } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import { toNumber } from "../utils/decimal.js";
import { parseDateOnly, formatDateOnly } from "../utils/date.js";

// --- Product Types ---

export async function listProductTypes(tenantId: string) {
  const rows = await prisma.productType.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as "shinshuku" | "shinshuku_gai" | "kyotai",
    sortOrder: r.sortOrder,
    regressionA: toNumber(r.regressionA),
    regressionB: toNumber(r.regressionB),
    processRatios: parseProcessRatios(r.processRatios),
    hasModelConfig:
      r.regressionA != null &&
      r.regressionB != null &&
      parseProcessRatios(r.processRatios) != null,
  }));
}

export async function createProductType(
  tenantId: string,
  data: { name: string; category: string; sortOrder?: number },
): Promise<Result<{ id: string }>> {
  const id = newId();
  await prisma.productType.create({
    data: {
      id,
      tenantId,
      name: data.name,
      category: data.category,
      sortOrder: data.sortOrder ?? 0,
    },
  });
  return { ok: true, data: { id } };
}

export async function updateProductType(
  tenantId: string,
  id: string,
  data: { name?: string; category?: string; sortOrder?: number },
): Promise<Result<{ id: string }>> {
  const existing = await prisma.productType.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "品種が見つかりません", code: "NOT_FOUND" };
  await prisma.productType.update({ where: { id }, data });
  return { ok: true, data: { id } };
}

export async function deleteProductType(
  tenantId: string,
  id: string,
): Promise<Result<{ id: string }>> {
  const existing = await prisma.productType.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "品種が見つかりません", code: "NOT_FOUND" };
  await prisma.productType.update({ where: { id }, data: { deletedAt: new Date() } });
  return { ok: true, data: { id } };
}

// --- Process Types ---

export async function listProcessTypes(tenantId: string) {
  const rows = await prisma.processType.findMany({
    where: { tenantId },
    orderBy: { displayOrder: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    displayOrder: r.displayOrder,
    defaultRatio: toNumber(r.defaultRatio) ?? 0,
    isWelding: r.isWelding,
  }));
}

export async function updateProcessType(
  tenantId: string,
  id: string,
  data: { name?: string; defaultRatio?: number; isWelding?: boolean },
): Promise<Result<{ id: string }>> {
  const existing = await prisma.processType.findFirst({ where: { id, tenantId } });
  if (!existing) return { ok: false, error: "工程が見つかりません", code: "NOT_FOUND" };
  await prisma.processType.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.defaultRatio != null
        ? { defaultRatio: new Prisma.Decimal(data.defaultRatio) }
        : {}),
      ...(data.isWelding != null ? { isWelding: data.isWelding } : {}),
    },
  });
  return { ok: true, data: { id } };
}

// --- Teams ---

export async function listTeams(tenantId: string) {
  const rows = await prisma.team.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { members: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sortOrder,
    memberCount: r._count.members,
  }));
}

export async function createTeam(
  tenantId: string,
  data: { name: string; sortOrder?: number },
): Promise<Result<{ id: string }>> {
  const id = newId();
  await prisma.team.create({
    data: { id, tenantId, name: data.name, sortOrder: data.sortOrder ?? 0 },
  });
  return { ok: true, data: { id } };
}

export async function updateTeam(
  tenantId: string,
  id: string,
  data: { name?: string; sortOrder?: number },
): Promise<Result<{ id: string }>> {
  const existing = await prisma.team.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "班が見つかりません", code: "NOT_FOUND" };
  await prisma.team.update({ where: { id }, data });
  return { ok: true, data: { id } };
}

export async function deleteTeam(
  tenantId: string,
  id: string,
): Promise<Result<{ id: string }>> {
  const existing = await prisma.team.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "班が見つかりません", code: "NOT_FOUND" };
  await prisma.team.update({ where: { id }, data: { deletedAt: new Date() } });
  return { ok: true, data: { id } };
}

export async function listTeamMembers(teamId: string, tenantId: string) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, tenantId, deletedAt: null },
  });
  if (!team) return null;
  const rows = await prisma.teamMember.findMany({
    where: { teamId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    teamId: r.teamId,
    name: r.name,
    userId: r.userId,
  }));
}

export async function addTeamMember(
  teamId: string,
  tenantId: string,
  data: { name: string; userId?: string },
): Promise<Result<{ id: string }>> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, tenantId, deletedAt: null },
  });
  if (!team) return { ok: false, error: "班が見つかりません", code: "NOT_FOUND" };
  const id = newId();
  await prisma.teamMember.create({
    data: { id, teamId, name: data.name, userId: data.userId ?? null },
  });
  return { ok: true, data: { id } };
}

export async function removeTeamMember(
  teamId: string,
  tenantId: string,
  memberId: string,
): Promise<Result<{ id: string }>> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, tenantId, deletedAt: null },
  });
  if (!team) return { ok: false, error: "班が見つかりません", code: "NOT_FOUND" };
  await prisma.teamMember.delete({ where: { id: memberId } });
  return { ok: true, data: { id: memberId } };
}

export async function updateTeamMember(
  teamId: string,
  tenantId: string,
  memberId: string,
  data: { name: string },
): Promise<Result<{ id: string }>> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, tenantId, deletedAt: null },
  });
  if (!team) return { ok: false, error: "班が見つかりません", code: "NOT_FOUND" };
  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, teamId },
  });
  if (!member) return { ok: false, error: "メンバーが見つかりません", code: "NOT_FOUND" };
  await prisma.teamMember.update({ where: { id: memberId }, data: { name: data.name } });
  return { ok: true, data: { id: memberId } };
}

// --- Calendar ---

export async function getCalendar(
  tenantId: string,
  start: string,
  end: string,
) {
  const rows = await prisma.calendar.findMany({
    where: {
      tenantId,
      date: { gte: parseDateOnly(start), lte: parseDateOnly(end) },
    },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    date: formatDateOnly(r.date),
    isHoliday: r.isHoliday,
    holidayName: r.holidayName,
  }));
}

export async function upsertCalendarDays(
  tenantId: string,
  days: { date: string; isHoliday: boolean; holidayName?: string | null }[],
): Promise<Result<{ count: number }>> {
  let count = 0;
  for (const day of days) {
    const date = parseDateOnly(day.date);
    const existing = await prisma.calendar.findUnique({
      where: { tenantId_date: { tenantId, date } },
    });
    if (existing) {
      await prisma.calendar.update({
        where: { id: existing.id },
        data: {
          isHoliday: day.isHoliday,
          holidayName: day.holidayName ?? null,
        },
      });
    } else {
      await prisma.calendar.create({
        data: {
          id: newId(),
          tenantId,
          date,
          isHoliday: day.isHoliday,
          holidayName: day.holidayName ?? null,
        },
      });
    }
    count++;
  }
  return { ok: true, data: { count } };
}

// --- Capacity ---

export async function listCapacitySettings(tenantId: string) {
  const rows = await prisma.capacitySetting.findMany({
    where: { tenantId },
    orderBy: [{ category: "asc" }, { teamId: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    teamId: r.teamId,
    category: r.category,
    regularHoursPerDay: toNumber(r.regularHoursPerDay) ?? 0,
    overtime2hPerDay: toNumber(r.overtime2hPerDay) ?? 0,
    overtime4hPerDay: toNumber(r.overtime4hPerDay) ?? 0,
    headcount: r.headcount,
  }));
}

export async function upsertCapacitySetting(
  tenantId: string,
  data: {
    id?: string;
    teamId?: string | null;
    category: string;
    regularHoursPerDay: number;
    overtime2hPerDay: number;
    overtime4hPerDay: number;
    headcount: number;
  },
): Promise<Result<{ id: string }>> {
  if (data.id) {
    const existing = await prisma.capacitySetting.findFirst({
      where: { id: data.id, tenantId },
    });
    if (!existing) return { ok: false, error: "設定が見つかりません", code: "NOT_FOUND" };
    await prisma.capacitySetting.update({
      where: { id: data.id },
      data: {
        regularHoursPerDay: new Prisma.Decimal(data.regularHoursPerDay),
        overtime2hPerDay: new Prisma.Decimal(data.overtime2hPerDay),
        overtime4hPerDay: new Prisma.Decimal(data.overtime4hPerDay),
        headcount: data.headcount,
      },
    });
    return { ok: true, data: { id: data.id } };
  }

  const existing = await prisma.capacitySetting.findFirst({
    where: {
      tenantId,
      teamId: data.teamId ?? null,
      category: data.category,
    },
  });
  if (existing) {
    await prisma.capacitySetting.update({
      where: { id: existing.id },
      data: {
        regularHoursPerDay: new Prisma.Decimal(data.regularHoursPerDay),
        overtime2hPerDay: new Prisma.Decimal(data.overtime2hPerDay),
        overtime4hPerDay: new Prisma.Decimal(data.overtime4hPerDay),
        headcount: data.headcount,
      },
    });
    return { ok: true, data: { id: existing.id } };
  }

  const id = newId();
  await prisma.capacitySetting.create({
    data: {
      id,
      tenantId,
      teamId: data.teamId ?? null,
      category: data.category,
      regularHoursPerDay: new Prisma.Decimal(data.regularHoursPerDay),
      overtime2hPerDay: new Prisma.Decimal(data.overtime2hPerDay),
      overtime4hPerDay: new Prisma.Decimal(data.overtime4hPerDay),
      headcount: data.headcount,
    },
  });
  return { ok: true, data: { id } };
}
