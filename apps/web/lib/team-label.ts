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
