const UNASSIGNED_TEAM_NAME = "製作班未定";

export function formatTeamLabel(
  teamName: string | null | undefined,
  fallback = "—",
): string {
  if (!teamName) return fallback;
  if (teamName === UNASSIGNED_TEAM_NAME) return "未定";
  return teamName;
}

/** 一覧向けの短い班表示（例: 中野班 → 中野、製作班未定 → 未定） */
export function formatTeamShortLabel(teamName: string | null | undefined): string {
  const label = formatTeamLabel(teamName, "—");
  if (label === "未定" || label === "—") return label;
  return label.replace(/班$/, "");
}

export function formatTeamShortLabels(
  teams: { teamName: string }[] | null | undefined,
): string {
  if (!teams?.length) return "未定";
  return teams.map((team) => formatTeamShortLabel(team.teamName)).join(", ");
}

export function formatTeamLabels(
  teams: { teamName: string }[] | null | undefined,
  fallback = "未割当",
): string {
  if (!teams?.length) return fallback;
  return teams.map((team) => formatTeamLabel(team.teamName)).join(", ");
}
