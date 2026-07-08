"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { fetchTeams, updateProject } from "@/lib/load-api";
import { formatTeamLabel } from "@/lib/team-label";
import { cn } from "@/lib/utils";
import type { ProjectTeamDto } from "@logivoice/shared";

type Props = {
  projectId: string;
  teams: ProjectTeamDto[];
  onUpdated?: () => void;
};

export function ProjectTeamSection({ projectId, teams, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const r = await fetchTeams();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const assignableTeams = useMemo(
    () => teamsQuery.data?.filter((team) => team.name !== "製作班未定") ?? [],
    [teamsQuery.data],
  );

  function startEditing() {
    setSelectedIds(teams.map((team) => team.teamId));
    setError(null);
    setEditing(true);
  }

  function toggleTeam(teamId: string) {
    setSelectedIds((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId],
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const r = await updateProject(projectId, { teamIds: selectedIds });
    setSaving(false);
    if (!r.ok) {
      setError(r.message ?? r.error ?? "班の更新に失敗しました");
      return;
    }
    setEditing(false);
    onUpdated?.();
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">アサイン班</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            複数班を割り当てると、各班の班シートで実績入力できます
          </p>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={startEditing}>
            班を編集
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button size="sm" loading={saving} onClick={() => void handleSave()}>
              保存
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="flex flex-wrap gap-2">
          {assignableTeams.map((team) => {
            const active = selectedIds.includes(team.id);
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => toggleTeam(team.id)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[13px] transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-white text-muted hover:text-text",
                )}
              >
                {formatTeamLabel(team.name)}
              </button>
            );
          })}
        </div>
      ) : teams.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {teams.map((team) => (
            <span
              key={team.id}
              className="rounded-md bg-bg px-2.5 py-1 text-[13px] text-text"
            >
              {formatTeamLabel(team.teamName)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">班が未割当です。編集から班を選択してください。</p>
      )}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
