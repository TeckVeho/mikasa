"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectPlanSection } from "@/components/project/ProjectPlanSection";
import { ProjectScheduleSection } from "@/components/project/ProjectScheduleSection";
import { ProjectTeamSection } from "@/components/project/ProjectTeamSection";
import { ProgressBar } from "@/components/project/ProgressBar";
import { VarianceDisplay } from "@/components/project/VarianceDisplay";
import { ProjectStatusBadge } from "@/components/project/ProjectStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  fetchProject,
  fetchProjectProgress,
  updateProject,
} from "@/lib/load-api";
import { formatTeamLabels } from "@/lib/team-label";
import { getDeadlineInfo } from "@/lib/deadline";
import { cn } from "@/lib/utils";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function ProcessPair({
  label,
  actual,
  target,
}: {
  label: string;
  actual: number;
  target: number;
}) {
  const variance = target - actual;
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">
        {actual}/{target} h
        <span className="ml-2 text-[12px] text-muted">
          差 <VarianceDisplay value={variance} suffix=" h" />
        </span>
      </dd>
    </>
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [month, setMonth] = useState(currentMonth);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [modelPanelOpen, setModelPanelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const r = await fetchProject(id);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const progress = useQuery({
    queryKey: ["project-progress", id],
    queryFn: async () => {
      const r = await fetchProjectProgress(id);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const assignedTeams = project.data?.teams ?? [];
  const activeTeamIds = assignedTeams.map((team) => team.teamId);

  async function handleDrawingReceived() {
    setActionLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const r = await updateProject(id, { drawingReceivedAt: today });
    setActionLoading(false);
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "図面受領の記録に失敗しました", "error");
      return;
    }
    showToast("図面受領を記録しました");
    void project.refetch();
  }

  async function handleShipped() {
    setActionLoading(true);
    const r = await updateProject(id, { status: "shipped" });
    setActionLoading(false);
    setShipDialogOpen(false);
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "出荷完了の更新に失敗しました", "error");
      return;
    }
    showToast("出荷完了に更新しました");
    void project.refetch();
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  function handleDataUpdated() {
    void project.refetch();
    void progress.refetch();
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["project-schedule", id, month] });
    for (const teamId of activeTeamIds) {
      void queryClient.invalidateQueries({ queryKey: ["team-schedule", teamId, month] });
    }
  }

  if (project.isLoading) return <Skeleton className="h-64" />;
  if (project.error || !project.data) {
    return <p className="text-sm text-danger">工事が見つかりません</p>;
  }

  const p = project.data;
  const deadlineInfo = getDeadlineInfo(p.deadline);
  const modelCreated = p.plannedHours != null;
  const hoursDiff =
    p.plannedHours != null && p.pastAverageHours != null
      ? Math.round((p.plannedHours - p.pastAverageHours) * 10) / 10
      : null;

  return (
    <div className="space-y-6">
      <nav
        aria-label="パンくずリスト"
        className="flex items-center gap-1 text-[13px]"
      >
        <Link href="/projects" className="text-muted transition-colors hover:text-text">
          工事一覧
        </Link>
        <ChevronRight className="h-3 w-3 text-muted/50" />
        <span className="font-medium text-text">
          {p.projectNumber} {p.projectName}
        </span>
      </nav>

      <PageHeader
        title={`${p.projectNumber} ${p.projectName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{formatTeamLabels(p.teams, "未割当")}</span>
            <ProjectStatusBadge status={p.status} />
            {modelCreated && (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] text-emerald-800">
                工程作成済（目標 {p.plannedHours} h）
              </span>
            )}
          </span>
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModelPanelOpen(true)}>
              {modelCreated ? "工程編集" : "工程作成"}
            </Button>
            {!p.drawingReceivedAt && (
              <Button
                variant="outline"
                loading={actionLoading}
                onClick={() => void handleDrawingReceived()}
              >
                図面受領
              </Button>
            )}
            {p.status !== "shipped" && (
              <Button
                variant="primary"
                loading={actionLoading}
                onClick={() => setShipDialogOpen(true)}
              >
                出荷完了
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">基本情報</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted">客先</dt>
            <dd>{p.clientName ?? "—"}</dd>
            <dt className="text-muted">品種</dt>
            <dd>{p.productTypeName ?? "—"}</dd>
            <dt className="text-muted">重量 t</dt>
            <dd>{p.weight != null ? `${p.weight} t` : "—"}</dd>
            <dt className="text-muted">部材長さ M</dt>
            <dd>{p.memberLength != null ? `${p.memberLength} m` : "—"}</dd>
            <dt className="text-muted">納期</dt>
            <dd>
              {p.deadline ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.deadline}</span>
                  {deadlineInfo && (
                    <Badge
                      variant={deadlineInfo.variant}
                      className={cn(
                        deadlineInfo.variant === "neutral" &&
                          "bg-border/60 text-muted-foreground",
                      )}
                    >
                      {deadlineInfo.label}
                    </Badge>
                  )}
                </span>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-muted">目標 / 過去平均</dt>
            <dd>
              {p.plannedHours != null ? (
                <span className="tabular-nums">
                  <span className="font-medium">{p.plannedHours} h</span>
                  {p.pastAverageHours != null && (
                    <>
                      <span className="text-muted"> / {p.pastAverageHours} h</span>
                      {hoursDiff != null && hoursDiff !== 0 && (
                        <span
                          className={cn(
                            "ml-1 text-[12px]",
                            hoursDiff > 0 ? "text-warning" : "text-success",
                          )}
                        >
                          ({hoursDiff > 0 ? "+" : ""}
                          {hoursDiff} h)
                        </span>
                      )}
                    </>
                  )}
                </span>
              ) : p.pastAverageHours != null ? (
                <span className="tabular-nums text-muted">
                  — / {p.pastAverageHours} h
                </span>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-muted">W割合</dt>
            <dd>
              {p.weldingRatio != null
                ? `${Math.round(p.weldingRatio * 1000) / 10}%`
                : "—"}
            </dd>
          </dl>
        </div>

        {progress.data && (
          <div className="rounded-lg border border-border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">進捗 KPI</h2>
            <dl className="grid grid-cols-2 items-center gap-2 text-sm">
              <dt className="text-muted">進捗率</dt>
              <dd>
                <ProgressBar rate={progress.data.progressRate} size="md" />
              </dd>
              <dt className="text-muted">実績</dt>
              <dd className="tabular-nums">{progress.data.actualHours} h</dd>
              <dt className="text-muted">差異</dt>
              <dd>
                <VarianceDisplay value={progress.data.variance} suffix=" h" />
              </dd>
              <dt className="text-muted">予想完了</dt>
              <dd className="tabular-nums">
                {progress.data.forecastHours ?? "—"} h
              </dd>
              <ProcessPair
                label="鍛冶"
                actual={progress.data.forgingActual}
                target={progress.data.forgingTarget}
              />
              <ProcessPair
                label="溶接"
                actual={progress.data.weldingActual}
                target={progress.data.weldingTarget}
              />
            </dl>
          </div>
        )}
      </div>

      <ProjectTeamSection
        projectId={id}
        teams={p.teams}
        onUpdated={handleDataUpdated}
      />

      <ProjectPlanSection
        project={p}
        onUpdated={handleDataUpdated}
        open={modelPanelOpen}
        onOpenChange={setModelPanelOpen}
      />

      <ProjectScheduleSection
        projectId={id}
        teams={p.teams}
        month={month}
        onMonthChange={setMonth}
        onUpdated={handleDataUpdated}
      />

      {progress.data && (
        <div className="rounded-lg border border-border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">工程別実績</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted">
                <th className="py-2">工程</th>
                <th className="text-right">目標</th>
                <th className="text-right">実績</th>
                <th className="text-right">差異</th>
                <th className="text-right">進捗</th>
              </tr>
            </thead>
            <tbody>
              {progress.data.processProgress.map((pp) => {
                const variance =
                  Math.round((pp.targetHours - pp.actualHours) * 10) / 10;
                return (
                  <tr
                    key={pp.processTypeId}
                    className="border-b border-border/50"
                  >
                    <td className="py-2">{pp.processTypeName}</td>
                    <td className="text-right tabular-nums">{pp.targetHours} h</td>
                    <td className="text-right tabular-nums">{pp.actualHours} h</td>
                    <td className="text-right">
                      <VarianceDisplay value={variance} suffix=" h" />
                    </td>
                    <td className="py-2">
                      <ProgressBar
                        rate={pp.progressRate}
                        className="justify-end"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={shipDialogOpen}
        title="出荷完了の確認"
        description={`「${p.projectNumber} ${p.projectName}」を出荷完了にしますか？この操作は元に戻せません。`}
        confirmLabel="出荷完了にする"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={() => void handleShipped()}
        onCancel={() => setShipDialogOpen(false)}
      />
    </div>
  );
}
