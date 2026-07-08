"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProjects, fetchTeams, updateProject } from "@/lib/load-api";
import { PROJECT_STATUS_LABELS } from "@logivoice/shared";
import { formatTeamLabel, formatTeamShortLabel } from "@/lib/team-label";
import { PROCESS_COLUMNS, PROCESS_SECTION_COLORS } from "@/lib/process-colors";
import { cn } from "@/lib/utils";

const { forging, welding, process, forecast } = PROCESS_SECTION_COLORS;

const STICKY_TEAM = "left-0 w-11 min-w-11";
const STICKY_NUMBER = "left-11 w-[4.5rem] min-w-[4.5rem]";
const STICKY_NAME = "left-[7.75rem] min-w-[10rem] max-w-[12rem] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]";

const thBase = "border-r border-border/40 px-2 py-1.5 text-[11px] font-medium text-muted last:border-r-0";
const tdBase = "border-r border-border/40 px-2 py-1.5 last:border-r-0";
const colGroupEnd = "border-r border-border";
const tdSticky =
  "sticky z-10 bg-white group-hover:bg-slate-50/90";
const thSticky = "sticky z-20 bg-bg";

function ProgressBar({ rate }: { rate: number }) {
  const over = rate > 100;
  const width = Math.min(Math.max(rate, 0), 100);

  return (
    <div className="flex items-center justify-end gap-1.5">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full", over ? "bg-danger" : "bg-primary")}
          style={{ width: `${width}%` }}
        />
      </div>
      <span
        className={cn(
          "min-w-[2.25rem] text-right text-[11px] tabular-nums",
          over && "font-medium text-danger",
        )}
      >
        {rate}%
      </span>
    </div>
  );
}

function VarianceCell({ value }: { value: number }) {
  return (
    <span className={cn("tabular-nums", value < 0 && "text-danger")}>{value}</span>
  );
}

function NumCell({
  children,
  className,
  groupBg,
  groupEnd,
}: {
  children: React.ReactNode;
  className?: string;
  groupBg?: string;
  groupEnd?: boolean;
}) {
  return (
    <td
      className={cn(
        tdBase,
        "text-right tabular-nums",
        groupBg,
        groupEnd && colGroupEnd,
        className,
      )}
    >
      {children}
    </td>
  );
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [listTab, setListTab] = useState<"all" | "unassigned">("all");
  const [teamId, setTeamId] = useState("");
  const [search, setSearch] = useState("");
  const [includeShipped, setIncludeShipped] = useState(false);
  const [editingW, setEditingW] = useState<string | null>(null);
  const [wValue, setWValue] = useState("");

  const teams = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const r = await fetchTeams();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["projects", listTab, teamId, search, includeShipped],
    queryFn: async () => {
      const r = await fetchProjects({
        excludeShipped: includeShipped ? "false" : "true",
        ...(listTab === "unassigned"
          ? { unassignedOnly: "true" }
          : teamId
            ? { teamId }
            : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  async function assignTeam(projectId: string, nextTeamId: string) {
    if (!nextTeamId) return;
    await updateProject(projectId, { teamId: nextTeamId });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  async function saveWeldingRatio(projectId: string) {
    const pct = Number(wValue);
    if (!Number.isFinite(pct)) return;
    await updateProject(projectId, { weldingRatio: pct / 100 });
    setEditingW(null);
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="工事一覧"
        description="全班統合サマリ（表シート相当）"
        action={
          <div className="flex gap-2">
            <Link
              href="/projects/import"
              className="inline-flex h-8 items-center rounded-md border border-border bg-white px-3 text-[13px] text-muted-foreground hover:bg-bg"
            >
              CSVインポート
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[13px] font-medium text-white hover:bg-primary-hover"
            >
              工事登録
            </Link>
          </div>
        }
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setListTab("all")}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px]",
            listTab === "all"
              ? "bg-primary text-white"
              : "border border-border bg-white text-muted hover:text-text",
          )}
        >
          全工事
        </button>
        <button
          type="button"
          onClick={() => setListTab("unassigned")}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px]",
            listTab === "unassigned"
              ? "bg-primary text-white"
              : "border border-border bg-white text-muted hover:text-text",
          )}
        >
          班未定
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-white px-4 py-3">
        {listTab === "all" ? (
        <label className="text-[13px] text-muted">
          班
          <select
            className="mt-1 block rounded-md border border-border px-3 py-1.5 text-sm"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">全班</option>
            {teams.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {formatTeamLabel(t.name)}
              </option>
            ))}
          </select>
        </label>
        ) : null}

        <label className="min-w-[200px] flex-1 text-[13px] text-muted">
          検索
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder="工番・工事名・客先"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-2 pb-1 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={includeShipped}
            onChange={(e) => setIncludeShipped(e.target.checked)}
            className="rounded border-border"
          />
          出荷済みも表示
        </label>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <p className="text-sm text-danger">{String(error)}</p>
      ) : data?.length === 0 ? (
        <p className="rounded-lg border border-border bg-white px-4 py-8 text-center text-sm text-muted">
          該当する工事がありません
        </p>
      ) : (
        <div className="max-h-[calc(100vh-14rem)] overflow-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[1280px] border-collapse text-[12px]">
            <thead className="sticky top-0 z-30">
              <tr className="border-b border-border text-left">
                <th
                  className={cn(thBase, thSticky, STICKY_TEAM, "bg-bg")}
                  rowSpan={2}
                >
                  班
                </th>
                <th
                  className={cn(thBase, thSticky, STICKY_NUMBER, "bg-bg")}
                  rowSpan={2}
                >
                  工番
                </th>
                <th
                  className={cn(thBase, thSticky, STICKY_NAME, "bg-bg", colGroupEnd)}
                  rowSpan={2}
                >
                  工事名,納期
                </th>
                <th className={cn(thBase, "bg-bg text-center", colGroupEnd)} colSpan={3}>
                  全体
                </th>
                <th className={cn(thBase, "bg-bg")} rowSpan={2}>
                  W割合
                </th>
                <th className={cn(thBase, "bg-bg", colGroupEnd)} rowSpan={2}>
                  進捗
                </th>
                <th
                  className={cn(thBase, forging.header, "text-center", colGroupEnd)}
                  colSpan={3}
                >
                  鍛冶
                </th>
                <th
                  className={cn(
                    thBase,
                    welding.header,
                    "text-center",
                    colGroupEnd,
                  )}
                  colSpan={3}
                >
                  溶接
                </th>
                <th
                  className={cn(
                    thBase,
                    process.header,
                    "text-center",
                    colGroupEnd,
                  )}
                  colSpan={6}
                >
                  工程別実績
                </th>
                <th
                  className={cn(
                    thBase,
                    forecast.header,
                    "text-center",
                    colGroupEnd,
                  )}
                  colSpan={3}
                >
                  予測
                </th>
                <th className={cn(thBase, "bg-bg")} rowSpan={2}>
                  状態
                </th>
              </tr>
              <tr className="border-b border-border text-left">
                <th className={cn(thBase, "bg-bg text-right")}>目標h</th>
                <th className={cn(thBase, "bg-bg text-right")}>実数</th>
                <th className={cn(thBase, "bg-bg text-right", colGroupEnd)}>差</th>
                <th className={cn(thBase, forging.header, "text-right")}>目標</th>
                <th className={cn(thBase, forging.header, "text-right")}>実数</th>
                <th className={cn(thBase, forging.header, "text-right", colGroupEnd)}>差</th>
                <th className={cn(thBase, welding.header, "text-right")}>目標</th>
                <th className={cn(thBase, welding.header, "text-right")}>実数</th>
                <th className={cn(thBase, welding.header, "text-right", colGroupEnd)}>差</th>
                {PROCESS_COLUMNS.map((name, i) => (
                  <th
                    key={name}
                    className={cn(
                      thBase,
                      process.header,
                      "text-right",
                      i === PROCESS_COLUMNS.length - 1 && colGroupEnd,
                    )}
                  >
                    {name}
                  </th>
                ))}
                <th className={cn(thBase, forecast.header, "text-right")}>
                  過去平均
                </th>
                <th className={cn(thBase, forecast.header, "text-right")}>
                  予想完了
                </th>
                <th className={cn(thBase, forecast.header, "text-right", colGroupEnd)}>
                  予想差
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.map((p) => (
                <tr
                  key={p.id}
                  className="group border-b border-border/60 hover:bg-slate-50/90"
                >
                  <td
                    className={cn(
                      tdBase,
                      "text-[11px] text-muted",
                      tdSticky,
                      STICKY_TEAM,
                    )}
                  >
                    {formatTeamShortLabel(p.teamName)}
                  </td>
                  <td className={cn(tdBase, tdSticky, STICKY_NUMBER)}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.projectNumber}
                    </Link>
                  </td>
                  <td className={cn(tdBase, tdSticky, STICKY_NAME, colGroupEnd)}>
                    <div className="truncate font-medium" title={p.projectName}>
                      {p.projectName}
                    </div>
                    <div className="text-[11px] text-muted">{p.deadline ?? "—"}</div>
                  </td>
                  <NumCell>{p.plannedHours ?? "—"}</NumCell>
                  <NumCell>{p.totalActualHours}</NumCell>
                  <NumCell groupEnd>
                    <VarianceCell value={p.variance ?? 0} />
                  </NumCell>
                  <td className={cn(tdBase, "text-right")}>
                    {editingW === p.id ? (
                      <input
                        type="number"
                        className="w-14 rounded border border-border px-1 py-0.5 text-center tabular-nums"
                        value={wValue}
                        onChange={(e) => setWValue(e.target.value)}
                        onBlur={() => saveWeldingRatio(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveWeldingRatio(p.id);
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="tabular-nums hover:text-primary"
                        onClick={() => {
                          setEditingW(p.id);
                          setWValue(
                            p.weldingRatio != null
                              ? String(Math.round(p.weldingRatio * 1000) / 10)
                              : "",
                          );
                        }}
                      >
                        {p.weldingRatio != null
                          ? `${Math.round(p.weldingRatio * 1000) / 10}`
                          : "—"}
                      </button>
                    )}
                  </td>
                  <td className={cn(tdBase, colGroupEnd)}>
                    <ProgressBar rate={p.progressRate ?? 0} />
                  </td>
                  <NumCell groupBg={forging.cell}>{p.forgingTarget}</NumCell>
                  <NumCell groupBg={forging.cell}>{p.forgingActual}</NumCell>
                  <NumCell groupBg={forging.cell} groupEnd>
                    <VarianceCell value={p.forgingVariance} />
                  </NumCell>
                  <NumCell groupBg={welding.cell}>{p.weldingTarget}</NumCell>
                  <NumCell groupBg={welding.cell}>{p.weldingActual}</NumCell>
                  <NumCell groupBg={welding.cell} groupEnd>
                    <VarianceCell value={p.weldingVariance} />
                  </NumCell>
                  {PROCESS_COLUMNS.map((name, i) => (
                    <NumCell
                      key={name}
                      groupBg={process.cell}
                      groupEnd={i === PROCESS_COLUMNS.length - 1}
                    >
                      {p.processSummary[name] ?? 0}
                    </NumCell>
                  ))}
                  <NumCell groupBg={forecast.cell}>
                    {p.pastAverageHours ?? "—"}
                  </NumCell>
                  <NumCell groupBg={forecast.cell}>
                    {p.forecastHours ?? "—"}
                  </NumCell>
                  <NumCell groupBg={forecast.cell} groupEnd>
                    {p.forecastVariance != null ? (
                      <VarianceCell value={p.forecastVariance} />
                    ) : (
                      "—"
                    )}
                  </NumCell>
                  <td className={cn(tdBase, "whitespace-nowrap text-[11px]")}>
                    {listTab === "unassigned" ? (
                      <select
                        className="rounded border border-border px-2 py-1 text-[11px]"
                        defaultValue=""
                        onChange={(e) => {
                          void assignTeam(p.id, e.target.value);
                          e.target.value = "";
                        }}
                      >
                        <option value="">班を選択</option>
                        {teams.data
                          ?.filter((t) => t.name !== "製作班未定")
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {formatTeamLabel(t.name)}
                            </option>
                          ))}
                      </select>
                    ) : (
                      PROJECT_STATUS_LABELS[p.status] ?? p.status
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
