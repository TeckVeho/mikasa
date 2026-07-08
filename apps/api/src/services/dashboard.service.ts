import type { DashboardSummaryDto } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/decimal.js";
import { formatDateOnly } from "../utils/date.js";
import { getLoadChart } from "./load-chart.service.js";
import { getAllProjectsProgress } from "./progress.service.js";

export async function getDashboardSummary(tenantId: string): Promise<DashboardSummaryDto> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const activeProjects = await prisma.project.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { in: ["in_progress", "drawing_wait", "shipping_wait"] },
    },
    include: { processRecords: { where: { recordType: "actual" } } },
  });

  let delayedCount = 0;
  let totalProgress = 0;
  for (const p of activeProjects) {
    const planned = toNumber(p.plannedHours) ?? 0;
    const actual = p.processRecords.reduce(
      (s, r) => s + (toNumber(r.hours) ?? 0),
      0,
    );
    const rate = planned > 0 ? (actual / planned) * 100 : 0;
    totalProgress += rate;
    if (p.deadline && p.deadline < now && p.status !== "shipped") {
      delayedCount++;
    }
  }

  const chart = await getLoadChart(
    tenantId,
    formatDateOnly(monthStart),
    formatDateOnly(monthEnd),
    "category",
  );
  const totalLoad = chart.dates.reduce((sum, _, i) => {
    const dayTotal = chart.series.reduce((s, series) => s + (series.values[i] ?? 0), 0);
    return sum + dayTotal;
  }, 0);
  const workingDays = chart.dates.length;
  const paceLine = chart.paceLines[0]?.value ?? 8;
  const capacity = paceLine * workingDays;
  const monthlyLoadRate =
    capacity > 0 ? Math.round((totalLoad / capacity) * 10000) / 100 : 0;

  return {
    activeProjectCount: activeProjects.length,
    delayedProjectCount: delayedCount,
    averageProgressRate:
      activeProjects.length > 0
        ? Math.round((totalProgress / activeProjects.length) * 100) / 100
        : 0,
    monthlyLoadRate,
  };
}

export async function getTeamDashboard(tenantId: string, teamId: string) {
  const team = await prisma.team.findFirst({
    where: { id: teamId, tenantId, deletedAt: null },
    include: { members: true },
  });
  if (!team) return null;

  const projects = await getAllProjectsProgress(tenantId, teamId);

  return {
    team: { id: team.id, name: team.name, members: team.members },
    projects,
  };
}
