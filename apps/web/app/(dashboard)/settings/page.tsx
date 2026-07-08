"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { TeamDto, TeamMemberDto } from "@logivoice/shared";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  SettingsPanel,
  SettingsTabBar,
  SettingsTable,
  SettingsTableBody,
  SettingsTableHead,
} from "@/components/settings/SettingsPanel";
import { ModelDayGridTab } from "@/components/settings/ModelDayGridTab";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  addTeamMember,
  deleteTeam,
  fetchCapacitySettings,
  fetchCalendar,
  fetchProcessTypes,
  fetchProductTypes,
  fetchTeamMembers,
  fetchTeams,
  removeTeamMember,
  saveCalendarDays,
  saveCapacitySetting,
  saveProcessType,
  saveProductType,
  saveTeam,
  updateTeamMember,
} from "@/lib/load-api";
import { formatTeamLabel } from "@/lib/team-label";
import { CATEGORY_LABELS } from "@logivoice/shared";

const UNASSIGNED_TEAM_NAME = "製作班未定";

type Tab = "product" | "process" | "team" | "capacity" | "calendar" | "model";

const TABS: { id: Tab; label: string }[] = [
  { id: "product", label: "品種" },
  { id: "process", label: "工程" },
  { id: "model", label: "モデル" },
  { id: "team", label: "班" },
  { id: "capacity", label: "キャパシティ" },
  { id: "calendar", label: "カレンダー" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("product");

  return (
    <div className="space-y-4">
      <PageHeader title="設定" description="マスタデータの管理" />
      <SettingsTabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === "product" && <ProductTypesTab />}
      {tab === "process" && <ProcessTypesTab />}
      {tab === "model" && <ModelDayGridTab />}
      {tab === "team" && <TeamsTab />}
      {tab === "capacity" && <CapacityTab />}
      {tab === "calendar" && <CalendarTab />}
    </div>
  );
}

function ProductTypesTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["product-types"],
    queryFn: async () => {
      const r = await fetchProductTypes();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });
  const [name, setName] = useState("");
  const [category, setCategory] = useState("kyotai");

  async function handleAdd() {
    if (!name.trim()) return;
    const r = await saveProductType({ name: name.trim(), category });
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "追加に失敗しました", "error");
      return;
    }
    setName("");
    showToast("品種を追加しました");
    void queryClient.invalidateQueries({ queryKey: ["product-types"] });
  }

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <SettingsPanel
      title="品種マスタ"
      description="工事登録時に選択する品種とカテゴリを管理します"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="品種名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-[200px]"
            onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
          />
          <select
            className="h-8 rounded-md border border-border bg-white px-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => void handleAdd()}>
            追加
          </Button>
        </div>
      }
    >
      <SettingsTable>
        <SettingsTableHead>
          <th className="px-2 py-2.5 font-medium">品種名</th>
          <th className="px-2 py-2.5 font-medium">カテゴリ</th>
          <th className="px-2 py-2.5 font-medium">モデル設定</th>
        </SettingsTableHead>
        <SettingsTableBody>
          {data?.length === 0 && (
            <tr>
              <td colSpan={3} className="px-2 py-6 text-center text-muted">
                品種が登録されていません
              </td>
            </tr>
          )}
          {data?.map((p) => (
            <tr key={p.id} className="hover:bg-bg/50">
              <td className="px-2 py-2.5 font-medium">{p.name}</td>
              <td className="px-2 py-2.5">{CATEGORY_LABELS[p.category]}</td>
              <td className="px-2 py-2.5 text-muted">
                {p.hasModelConfig ? "あり" : "—"}
              </td>
            </tr>
          ))}
        </SettingsTableBody>
      </SettingsTable>
    </SettingsPanel>
  );
}

function ProcessTypesTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["process-types"],
    queryFn: async () => {
      const r = await fetchProcessTypes();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const ratioTotalPercent = useMemo(() => {
    if (!data?.length) return 0;
    const sum = data.reduce((acc, p) => acc + p.defaultRatio, 0);
    return Math.round(sum * 1000) / 10;
  }, [data]);

  async function updateRatio(id: string, ratio: number) {
    const r = await saveProcessType(id, { defaultRatio: ratio });
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "保存に失敗しました", "error");
      return;
    }
    showToast("保存しました");
    void queryClient.invalidateQueries({ queryKey: ["process-types"] });
  }

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <SettingsPanel
      title="工程マスタ"
      description="各工程のデフォルト配分比率を設定します（フォーカスを外すと保存）。合計は100%になるよう調整してください"
    >
      <SettingsTable>
        <SettingsTableHead>
          <th className="px-2 py-2.5 font-medium">工程</th>
          <th className="px-2 py-2.5 font-medium">デフォルト比率</th>
          <th className="px-2 py-2.5 font-medium">溶接系</th>
        </SettingsTableHead>
        <SettingsTableBody>
          {data?.map((p) => (
            <tr key={p.id} className="hover:bg-bg/50">
              <td className="px-2 py-2.5 font-medium">{p.name}</td>
              <td className="px-2 py-2.5">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    step="0.001"
                    className="h-8 w-28"
                    defaultValue={p.defaultRatio}
                    onBlur={(e) => updateRatio(p.id, Number(e.target.value))}
                  />
                  <span className="text-xs tabular-nums text-muted">
                    ({Math.round(p.defaultRatio * 1000) / 10}%)
                  </span>
                </div>
              </td>
              <td className="px-2 py-2.5 text-muted">{p.isWelding ? "はい" : "—"}</td>
            </tr>
          ))}
          {data && data.length > 0 && (
            <tr className="border-t border-border bg-bg/50 font-medium">
              <td className="px-2 py-2.5">合計</td>
              <td className="px-2 py-2.5 tabular-nums">
                <span className={ratioTotalPercent === 100 ? "text-text" : "text-warning"}>
                  {ratioTotalPercent}%
                </span>
              </td>
              <td className="px-2 py-2.5" />
            </tr>
          )}
        </SettingsTableBody>
      </SettingsTable>
    </SettingsPanel>
  );
}

function TeamsTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TeamDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const r = await fetchTeams();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  async function handleUpdateTeam(id: string, patch: { name?: string; sortOrder?: number }) {
    const r = await saveTeam(patch, id);
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "保存に失敗しました", "error");
      return;
    }
    showToast("保存しました");
    void queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  async function handleAddTeam() {
    const name = newName.trim();
    if (!name) return;
    const maxSort = data?.reduce((m, t) => Math.max(m, t.sortOrder), 0) ?? 0;
    const r = await saveTeam({ name, sortOrder: maxSort + 1 });
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "追加に失敗しました", "error");
      return;
    }
    setNewName("");
    showToast("班を追加しました");
    void queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  async function handleDeleteTeam() {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await deleteTeam(deleteTarget.id);
    setDeleting(false);
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "削除に失敗しました", "error");
      return;
    }
    if (expandedId === deleteTarget.id) setExpandedId(null);
    setDeleteTarget(null);
    showToast("班を削除しました");
    void queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <>
      <SettingsPanel
        title="班マスタ"
        description="製作班の名称・表示順・メンバーを管理します。行をクリックしてメンバーを編集できます"
        footer={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="新しい班名（例: 田中班）"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-[240px]"
              onKeyDown={(e) => e.key === "Enter" && void handleAddTeam()}
            />
            <Button size="sm" onClick={() => void handleAddTeam()}>
              班を追加
            </Button>
          </div>
        }
      >
        <SettingsTable>
          <SettingsTableHead>
            <th className="w-8 px-1 py-2.5" />
            <th className="w-16 px-2 py-2.5 font-medium">順</th>
            <th className="px-2 py-2.5 font-medium">班名</th>
            <th className="w-20 px-2 py-2.5 font-medium text-right">人数</th>
            <th className="w-16 px-2 py-2.5" />
          </SettingsTableHead>
          <SettingsTableBody>
            {data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-muted">
                  班が登録されていません
                </td>
              </tr>
            )}
            {data?.map((team) => {
              const isExpanded = expandedId === team.id;
              const isSystem = team.name === UNASSIGNED_TEAM_NAME;
              return (
                <TeamRow
                  key={team.id}
                  team={team}
                  isExpanded={isExpanded}
                  isSystem={isSystem}
                  onToggle={() => setExpandedId(isExpanded ? null : team.id)}
                  onUpdate={(patch) => void handleUpdateTeam(team.id, patch)}
                  onDelete={() => setDeleteTarget(team)}
                />
              );
            })}
          </SettingsTableBody>
        </SettingsTable>
      </SettingsPanel>

      <ConfirmDialog
        isOpen={deleteTarget != null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteTeam()}
        title="班を削除"
        description={`「${formatTeamLabel(deleteTarget?.name)}」を削除しますか？関連するメンバーも削除されます。`}
        confirmLabel="削除"
        isLoading={deleting}
      />
    </>
  );
}

function TeamRow({
  team,
  isExpanded,
  isSystem,
  onToggle,
  onUpdate,
  onDelete,
}: {
  team: TeamDto;
  isExpanded: boolean;
  isSystem: boolean;
  onToggle: () => void;
  onUpdate: (patch: { name?: string; sortOrder?: number }) => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [newMemberName, setNewMemberName] = useState("");

  const membersQuery = useQuery({
    queryKey: ["team-members", team.id],
    queryFn: async () => {
      const r = await fetchTeamMembers(team.id);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    enabled: isExpanded,
  });

  async function handleAddMember() {
    const name = newMemberName.trim();
    if (!name) return;
    const r = await addTeamMember(team.id, { name });
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "追加に失敗しました", "error");
      return;
    }
    setNewMemberName("");
    showToast("メンバーを追加しました");
    void queryClient.invalidateQueries({ queryKey: ["team-members", team.id] });
    void queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  async function handleRemoveMember(member: TeamMemberDto) {
    const r = await removeTeamMember(team.id, member.id);
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "削除に失敗しました", "error");
      return;
    }
    showToast("メンバーを削除しました");
    void queryClient.invalidateQueries({ queryKey: ["team-members", team.id] });
    void queryClient.invalidateQueries({ queryKey: ["teams"] });
  }

  async function handleUpdateMember(member: TeamMemberDto, name: string) {
    if (name.trim() === member.name) return;
    const r = await updateTeamMember(team.id, member.id, { name: name.trim() });
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "保存に失敗しました", "error");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["team-members", team.id] });
  }

  return (
    <>
      <tr className="group hover:bg-bg/50">
        <td className="px-1 py-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-border/40 hover:text-text"
            aria-label={isExpanded ? "閉じる" : "メンバーを表示"}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-2 py-2">
          <Input
            type="number"
            className="h-8 w-14 text-center"
            defaultValue={team.sortOrder}
            onBlur={(e) => onUpdate({ sortOrder: Number(e.target.value) })}
          />
        </td>
        <td className="px-2 py-2">
          {isSystem ? (
            <span className="font-medium text-muted">{formatTeamLabel(team.name)}</span>
          ) : (
            <Input
              className="h-8 max-w-[200px] font-medium"
              defaultValue={team.name}
              onBlur={(e) => onUpdate({ name: e.target.value.trim() })}
            />
          )}
        </td>
        <td className="px-2 py-2 text-right text-muted">{team.memberCount ?? 0}</td>
        <td className="px-2 py-2">
          {!isSystem && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-1.5 text-muted opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
              aria-label="削除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-bg/30 px-4 py-3">
            <div className="ml-8 space-y-3">
              <p className="text-xs font-medium text-muted">メンバー</p>
              {membersQuery.isLoading ? (
                <Skeleton className="h-8 w-full max-w-sm" />
              ) : membersQuery.data?.length === 0 ? (
                <p className="text-xs text-muted">メンバーが登録されていません</p>
              ) : (
                <ul className="space-y-1.5">
                  {membersQuery.data?.map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      <Input
                        className="h-8 max-w-[180px]"
                        defaultValue={m.name}
                        onBlur={(e) => void handleUpdateMember(m, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => void handleRemoveMember(m)}
                        className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        aria-label="メンバーを削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="メンバー名"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="h-8 max-w-[180px]"
                  onKeyDown={(e) => e.key === "Enter" && void handleAddMember()}
                />
                <Button size="sm" variant="secondary" onClick={() => void handleAddMember()}>
                  追加
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CapacityTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["capacity-settings"],
    queryFn: async () => {
      const r = await fetchCapacitySettings();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  async function save(id: string, field: string, value: number) {
    const row = data?.find((c) => c.id === id);
    if (!row) return;
    const r = await saveCapacitySetting({
      id,
      category: row.category,
      teamId: row.teamId,
      regularHoursPerDay: field === "regular" ? value : row.regularHoursPerDay,
      overtime2hPerDay: field === "ot2" ? value : row.overtime2hPerDay,
      overtime4hPerDay: field === "ot4" ? value : row.overtime4hPerDay,
      headcount: field === "headcount" ? value : row.headcount,
    });
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "保存に失敗しました", "error");
      return;
    }
    showToast("保存しました");
    void queryClient.invalidateQueries({ queryKey: ["capacity-settings"] });
  }

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <SettingsPanel
      title="キャパシティ設定"
      description="カテゴリ別の1日あたり稼働時間と人数を設定します（フォーカスを外すと保存）"
    >
      <SettingsTable>
        <SettingsTableHead>
          <th className="px-2 py-2.5 font-medium">カテゴリ</th>
          <th className="px-2 py-2.5 font-medium">定時間</th>
          <th className="px-2 py-2.5 font-medium">2H残業</th>
          <th className="px-2 py-2.5 font-medium">4H残業</th>
          <th className="px-2 py-2.5 font-medium">人数</th>
        </SettingsTableHead>
        <SettingsTableBody>
          {data?.map((c) => (
            <tr key={c.id} className="hover:bg-bg/50">
              <td className="px-2 py-2.5 font-medium">
                {CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category}
              </td>
              <td className="px-2 py-2.5">
                <Input
                  type="number"
                  className="h-8 w-20"
                  defaultValue={c.regularHoursPerDay}
                  onBlur={(e) => save(c.id, "regular", Number(e.target.value))}
                />
              </td>
              <td className="px-2 py-2.5">
                <Input
                  type="number"
                  className="h-8 w-20"
                  defaultValue={c.overtime2hPerDay}
                  onBlur={(e) => save(c.id, "ot2", Number(e.target.value))}
                />
              </td>
              <td className="px-2 py-2.5">
                <Input
                  type="number"
                  className="h-8 w-20"
                  defaultValue={c.overtime4hPerDay}
                  onBlur={(e) => save(c.id, "ot4", Number(e.target.value))}
                />
              </td>
              <td className="px-2 py-2.5">
                <Input
                  type="number"
                  className="h-8 w-20"
                  defaultValue={c.headcount}
                  onBlur={(e) => save(c.id, "headcount", Number(e.target.value))}
                />
              </td>
            </tr>
          ))}
        </SettingsTableBody>
      </SettingsTable>
    </SettingsPanel>
  );
}

function CalendarTab() {
  const year = new Date().getFullYear();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["calendar", year],
    queryFn: async () => {
      const r = await fetchCalendar(start, end);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const holidaySet = new Set(data?.filter((d) => d.isHoliday).map((d) => d.date) ?? []);

  async function toggleHoliday(date: string) {
    const isHoliday = !holidaySet.has(date);
    const r = await saveCalendarDays([
      { date, isHoliday, holidayName: isHoliday ? "休日" : null },
    ]);
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "保存に失敗しました", "error");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["calendar", year] });
  }

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const months = Array.from({ length: 12 }, (_, m) => {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, d) => {
      const day = d + 1;
      const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dow = new Date(date).getDay();
      return { date, day, isWeekend: dow === 0 || dow === 6 };
    });
  });

  return (
    <SettingsPanel
      title={`${year}年 カレンダー`}
      description="日付をクリックして休日を切り替えます。土日は初期状態で休日表示です"
    >
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-5 w-5 rounded bg-primary/10" />
          稼働日
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-5 w-5 rounded bg-muted/30 line-through" />
          休日
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((days, mi) => (
          <div key={mi} className="rounded-lg border border-border/60 p-3">
            <p className="mb-2 text-xs font-semibold text-text">{mi + 1}月</p>
            <div className="flex flex-wrap gap-1">
              {days.map((d) => {
                const isHoliday = holidaySet.has(d.date) || d.isWeekend;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => void toggleHoliday(d.date)}
                    className={`h-7 w-7 rounded text-xs transition-colors ${
                      isHoliday
                        ? "bg-muted/30 text-muted line-through hover:bg-muted/50"
                        : "bg-primary/10 text-text hover:bg-primary/20"
                    }`}
                    title={d.date}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SettingsPanel>
  );
}
