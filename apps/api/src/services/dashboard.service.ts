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

  return {
    ok: true,
    data: {
      totalCalls,
      completionRate: totalCalls > 0 ? completed / totalCalls : 0,
      avgDuration,
      transferCount: transferred,
      prevPeriodComparison: {
        totalCalls: 0,
        completionRate: 0,
      },
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
