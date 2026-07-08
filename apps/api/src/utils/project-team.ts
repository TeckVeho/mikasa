import { UNASSIGNED_TEAM_ID } from "@logivoice/shared";
import { prisma } from "../lib/prisma.js";
import { newId } from "./id.js";

export function normalizeTeamIds(
  teamId?: string | null,
  teamIds?: string[] | null,
): string[] {
  const fromArray = (teamIds ?? []).filter((id) => id && id !== UNASSIGNED_TEAM_ID);
  if (fromArray.length > 0) return [...new Set(fromArray)];
  if (teamId && teamId !== UNASSIGNED_TEAM_ID) return [teamId];
  return [];
}

export function mapProjectTeams(
  projectTeams: { id: string; teamId: string; sortOrder: number; team: { name: string } }[],
) {
  return projectTeams
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.team.name.localeCompare(b.team.name, "ja"))
    .map((pt) => ({
      id: pt.id,
      teamId: pt.teamId,
      teamName: pt.team.name,
      sortOrder: pt.sortOrder,
    }));
}

export function legacyTeamFields(teams: { teamId: string; teamName: string }[]) {
  const first = teams[0];
  return {
    teamId: first?.teamId ?? UNASSIGNED_TEAM_ID,
    teamName: first?.teamName ?? null,
  };
}

export async function syncProjectTeams(
  projectId: string,
  teamIds: string[],
): Promise<void> {
  const normalized = normalizeTeamIds(null, teamIds);
  const existing = await prisma.projectTeam.findMany({
    where: { projectId },
    select: { teamId: true },
  });
  const existingIds = new Set(existing.map((row) => row.teamId));
  const nextIds = new Set(normalized);

  const toDelete = [...existingIds].filter((id) => !nextIds.has(id));
  const toAdd = [...nextIds].filter((id) => !existingIds.has(id));

  if (toDelete.length > 0) {
    await prisma.projectTeam.deleteMany({
      where: { projectId, teamId: { in: toDelete } },
    });
  }

  if (toAdd.length > 0) {
    await prisma.projectTeam.createMany({
      data: toAdd.map((teamId) => ({
        id: newId(),
        projectId,
        teamId,
        sortOrder: normalized.indexOf(teamId),
      })),
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      teamId: normalized[0] ?? UNASSIGNED_TEAM_ID,
    },
  });
}

export async function assertProjectAssignedToTeam(
  projectId: string,
  teamId: string,
): Promise<boolean> {
  const row = await prisma.projectTeam.findFirst({
    where: { projectId, teamId },
  });
  return row != null;
}
