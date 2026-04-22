import type { Result } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";

function startOfPeriod(period: string, from?: string): Date {
  const now = new Date();
  if (period === "custom" && from) return new Date(from);
  if (period === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return d;
}

function endOfPeriod(period: string, customTo?: string): Date {
  if (period === "custom" && customTo) return new Date(customTo);
  return new Date();
}

export async function dashboardSummary(
  tenantId: string,
  period: string,
  from?: string,
  to?: string,
): Promise<Result<unknown>> {
  const start = startOfPeriod(period, from);
  const end = endOfPeriod(period, to);

  const [totalCalls, completed, transferred, durations] = await Promise.all([
    prisma.callLog.count({
      where: { tenantId, createdAt: { gte: start, lte: end } },
    }),
    prisma.callLog.count({
      where: {
        tenantId,
        status: "complete",
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.callLog.count({
      where: {
        tenantId,
        status: "transferred",
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.callLog.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      select: { durationSeconds: true },
    }),
  ]);

  const avgDuration =
    durations.length > 0
      ? Math.round(
          durations.reduce((a, b) => a + (b.durationSeconds ?? 0), 0) /
            durations.length,
        )
      : 0;

  const periodMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - periodMs);
  const [prevTotal, prevCompleted] = await Promise.all([
    prisma.callLog.count({
      where: { tenantId, createdAt: { gte: prevStart, lt: prevEnd } },
    }),
    prisma.callLog.count({
      where: {
        tenantId,
        status: "complete",
        createdAt: { gte: prevStart, lt: prevEnd },
      },
    }),
  ]);

  const currentCr = totalCalls > 0 ? completed / totalCalls : 0;
  const prevCr = prevTotal > 0 ? prevCompleted / prevTotal : 0;

  return {
    ok: true,
    data: {
      totalCalls,
      completionRate: currentCr,
      avgDuration,
      transferCount: transferred,
      prevPeriodComparison: {
        totalCalls: prevTotal > 0 ? (totalCalls - prevTotal) / prevTotal : 0,
        completionRate: currentCr - prevCr,
      },
    },
  };
}

export async function dashboardByScenario(
  tenantId: string,
): Promise<Result<unknown>> {
  const rows = await prisma.callLog.groupBy({
    by: ["scenarioId"],
    where: { tenantId },
    _count: { id: true },
  });
  const scenarios = await prisma.scenario.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
  const nameById = new Map(scenarios.map((s) => [s.id, s.name]));
  return {
    ok: true,
    data: rows.map((r) => ({
      scenarioId: r.scenarioId,
      scenarioName: nameById.get(r.scenarioId) ?? r.scenarioId,
      callCount: r._count.id,
    })),
  };
}

export async function dashboardByNumber(
  tenantId: string,
): Promise<Result<unknown>> {
  const rows = await prisma.callLog.groupBy({
    by: ["phoneNumberId"],
    where: { tenantId },
    _count: { id: true },
  });
  const nums = await prisma.phoneNumber.findMany({
    where: { tenantId },
    select: { id: true, number: true },
  });
  const numById = new Map(nums.map((n) => [n.id, n.number]));
  return {
    ok: true,
    data: rows.map((r) => ({
      phoneNumberId: r.phoneNumberId,
      number: numById.get(r.phoneNumberId) ?? r.phoneNumberId,
      callCount: r._count.id,
    })),
  };
}

export async function dashboardCostEstimate(
  tenantId: string,
): Promise<Result<unknown>> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const logs = await prisma.callLog.findMany({
    where: { tenantId, createdAt: { gte: start } },
    select: { durationSeconds: true },
  });
  const minutes =
    logs.reduce((a, l) => a + (l.durationSeconds ?? 0), 0) / 60;
  return {
    ok: true,
    data: {
      monthToDateCalls: logs.length,
      totalMinutes: Math.round(minutes * 10) / 10,
      estimatedUsd: Math.round(minutes * 0.08 * 100) / 100,
    },
  };
}

export async function dailyCalls(
  tenantId: string,
  days = 30,
): Promise<Result<unknown>> {
  const start = new Date();
  start.setDate(start.getDate() - days);
  const rows = await prisma.callLog.findMany({
    where: { tenantId, createdAt: { gte: start } },
    select: { createdAt: true },
  });
  const byDay = new Map<string, number>();
  for (const l of rows) {
    const d = l.createdAt.toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  return {
    ok: true,
    data: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
  };
}

export async function hourlyDistribution(
  tenantId: string,
): Promise<Result<unknown>> {
  const logs = await prisma.callLog.findMany({
    where: { tenantId },
    select: { createdAt: true },
    take: 10000,
  });
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const l of logs) {
    buckets[l.createdAt.getHours()]!.count += 1;
  }
  return { ok: true, data: buckets };
}

export async function operatorSummary(
  tenantId: string,
): Promise<Result<unknown>> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayCalls, pendingCallbacks, recentTransfers, recentCalls] =
    await Promise.all([
      prisma.callLog.count({
        where: { tenantId, createdAt: { gte: todayStart } },
      }),
      prisma.callbackRequest.count({
        where: { tenantId, status: "pending" },
      }),
      prisma.transferHandoff.count({
        where: { tenantId, status: "pending" },
      }),
      prisma.callLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          callerNumber: true,
          status: true,
          summaryText: true,
          durationSeconds: true,
          createdAt: true,
        },
      }),
    ]);

  return {
    ok: true,
    data: {
      todayCalls,
      pendingCallbacks,
      pendingTransfers: recentTransfers,
      recentCalls,
    },
  };
}
