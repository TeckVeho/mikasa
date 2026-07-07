"use client";

import { formatTeamLabel } from "@/lib/team-label";
import { cn } from "@/lib/utils";

export const ALL_TEAMS_TAB = "all";

type Team = { id: string; name: string };

type Props = {
  teams: Team[];
  activeTeamId: string;
  onChange: (teamId: string) => void;
};

export function TeamTabs({ teams, activeTeamId, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border pb-3">
      <button
        type="button"
        onClick={() => onChange(ALL_TEAMS_TAB)}
        className={cn(
          "rounded-md px-2.5 py-1 text-[12px] transition-colors",
          activeTeamId === ALL_TEAMS_TAB
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted hover:bg-bg",
        )}
      >
        すべて
      </button>
      {teams.map((team) => (
        <button
          key={team.id}
          type="button"
          onClick={() => onChange(team.id)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12px] transition-colors",
            activeTeamId === team.id
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted hover:bg-bg",
          )}
        >
          {formatTeamLabel(team.name)}
        </button>
      ))}
    </div>
  );
}
