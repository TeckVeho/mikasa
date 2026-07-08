import type { ProjectProgressDto } from "@logivoice/shared";
import { resolveProcessRatio, round1 } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/decimal.js";
import { loadTenantProcessRatios } from "./model.service.js";

export async function getProjectProgress(
  tenantId: string,
  projectId: string,
): Promise<ProjectProgressDto | null> {
  const [project, processTypes, historicalRatios] = await Promise.all([
    prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      include: {
        processRecords: { where: { recordType: "actual" }, include: { processType: true } },
      },
    }),
    prisma.processType.findMany({
      where: { tenantId },
      orderBy: { displayOrder: "asc" },
    }),
    loadTenantProcessRatios(tenantId),
  ]);
  if (!project) return null;

  const plannedHours = toNumber(project.plannedHours) ?? 0;
  const weldingRatio = toNumber(project.weldingRatio) ?? 0.2;

  const recordsByProcess = new Map<string, number>();
  for (const r of project.processRecords) {
    const current = recordsByProcess.get(r.processTypeId) ?? 0;
    recordsByProcess.set(r.processTypeId, current + (toNumber(r.hours) ?? 0));
  }

  const processProgress = processTypes.map((pt) => {
    const defaultRatio = toNumber(pt.defaultRatio) ?? 0;
    const ratio = resolveProcessRatio(pt.name, historicalRatios, defaultRatio);
    const targetHours = round1(plannedHours * ratio);
    const actualHours = recordsByProcess.get(pt.id) ?? 0;
    const progressRate =
      targetHours > 0 ? Math.round((actualHours / targetHours) * 10000) / 100 : 0;
    return {
      processTypeId: pt.id,
      processTypeName: pt.name,
      targetHours,
      actualHours: Math.round(actualHours * 100) / 100,
      progressRate,
    };
  });

  const actualHours = processProgress.reduce((s, p) => s + p.actualHours, 0);
  const progressRate =
    plannedHours > 0 ? Math.round((actualHours / plannedHours) * 10000) / 100 : 0;
  const variance = Math.round((plannedHours - actualHours) * 100) / 100;

  const weldingTarget = round1(plannedHours * weldingRatio);
  const weldingActual = processProgress
    .filter((p) => {
      const pt = processTypes.find((t) => t.id === p.processTypeId);
      return pt?.isWelding;
    })
    .reduce((s, p) => s + p.actualHours, 0);
  const forgingTarget = round1(plannedHours - weldingTarget);
  const forgingActual = Math.round((actualHours - weldingActual) * 100) / 100;

  const forecastHours =
    progressRate > 0
      ? Math.round((actualHours / progressRate) * 10000) / 100
      : null;
  const forecastVariance =
    forecastHours != null
      ? Math.round((plannedHours - forecastHours) * 100) / 100
      : null;

  return {
    projectId,
    plannedHours,
    actualHours: Math.round(actualHours * 100) / 100,
    progressRate,
    variance,
    forecastHours,
    forecastVariance,
    forgingTarget,
    forgingActual,
    weldingTarget,
    weldingActual: Math.round(weldingActual * 100) / 100,
    processProgress,
  };
}

export async function getAllProjectsProgress(tenantId: string, teamId?: string) {
  const projects = await prisma.project.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(teamId ? { projectTeams: { some: { teamId } } } : {}),
    },
    select: { id: true, projectNumber: true, projectName: true },
  });

  const results: {
    projectId: string;
    projectNumber: string;
    projectName: string;
    plannedHours: number;
    actualHours: number;
    progressRate: number;
    variance: number;
    forecastHours: number | null;
    forecastVariance: number | null;
  }[] = [];
  for (const p of projects) {
    const progress = await getProjectProgress(tenantId, p.id);
    if (progress) {
      results.push({
        projectId: p.id,
        projectNumber: p.projectNumber,
        projectName: p.projectName,
        plannedHours: progress.plannedHours,
        actualHours: progress.actualHours,
        progressRate: progress.progressRate,
        variance: progress.variance,
        forecastHours: progress.forecastHours,
        forecastVariance: progress.forecastVariance,
      });
    }
  }
  return results;
}
