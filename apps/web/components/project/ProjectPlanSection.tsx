"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectListItemDto } from "@logivoice/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidePanel } from "@/components/ui/slide-panel";
import { useToast } from "@/components/ui/toast";
import { applyProjectModel, previewProjectModel } from "@/lib/load-api";
import { formatTeamLabel } from "@/lib/team-label";

type Props = {
  project: ProjectListItemDto;
  onUpdated: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectPlanSection({
  project,
  onUpdated,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weight, setWeight] = useState(project.weight?.toString() ?? "");
  const [memberLength, setMemberLength] = useState(
    project.memberLength?.toString() ?? "",
  );

  const modelCreated = project.plannedHours != null;

  useEffect(() => {
    setWeight(project.weight?.toString() ?? "");
    setMemberLength(project.memberLength?.toString() ?? "");
  }, [project.weight, project.memberLength]);

  const weightNum = weight ? Number(weight) : NaN;
  const memberLengthNum = memberLength ? Number(memberLength) : NaN;
  const canPreview =
    Number.isFinite(weightNum) &&
    Number.isFinite(memberLengthNum) &&
    weightNum > 0 &&
    memberLengthNum > 0;

  const preview = useQuery({
    queryKey: ["model-preview", project.id, weightNum, memberLengthNum],
    enabled: canPreview && open,
    queryFn: async () => {
      const r = await previewProjectModel(project.id, {
        weight: weightNum,
        memberLength: memberLengthNum,
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  async function handleApplyModel() {
    if (!canPreview) return;
    setSaving(true);
    setError(null);
    const r = await applyProjectModel(project.id, {
      weight: weightNum,
      memberLength: memberLengthNum,
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.message ?? r.error);
      showToast(r.message ?? r.error ?? "モデルの保存に失敗しました", "error");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["project", project.id] });
    void queryClient.invalidateQueries({ queryKey: ["project-progress", project.id] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    onUpdated();
    onOpenChange(false);
    showToast(modelCreated ? "モデルを更新しました" : "モデルを作成しました");
  }

  const panelDescription = modelCreated
    ? `作成済み（目標 ${project.plannedHours} h）`
    : "全品種の過去実績から回帰式を算出し、目標時間を求めます";

  return (
    <SlidePanel
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="モデル作成（t・M 回帰）"
      description={panelDescription}
      width="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            type="button"
            disabled={saving || !canPreview || preview.isLoading || !preview.data}
            loading={saving}
            onClick={() => void handleApplyModel()}
          >
            {modelCreated ? "モデルを再作成" : "モデル作成"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-[13px] text-muted">
          過去平均 = ((t/M×1000)×a + b) × t
          {preview.data && (
            <>
              {" · "}
              回帰参照 {preview.data.sampleCount} 件
            </>
          )}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>重量 t（トン）</span>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>部材長さ M（m）</span>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={memberLength}
              onChange={(e) => setMemberLength(e.target.value)}
            />
          </label>
        </div>

        {preview.isLoading && canPreview ? (
          <Skeleton className="h-20" />
        ) : preview.error ? (
          <p className="text-sm text-danger">{String(preview.error)}</p>
        ) : preview.data ? (
          <div className="rounded-md bg-bg px-3 py-2 text-sm">
            <p>
              過去平均（全体目標）:{" "}
              <span className="font-medium tabular-nums">
                {preview.data.pastAverageHours} h
              </span>
            </p>
            <p className="mt-1 text-[12px] text-muted">
              回帰係数 a={preview.data.regressionA.toFixed(4)}, b=
              {preview.data.regressionB.toFixed(3)}（{preview.data.sampleCount}
              件）
            </p>
            <p className="mt-1 text-[12px] text-muted">
              溶接比率（自動）:{" "}
              {Math.round(preview.data.weldingRatio * 1000) / 10}%
            </p>
          </div>
        ) : canPreview ? null : (
          <p className="text-sm text-muted">
            重量 t と部材長さ M を入力すると回帰計算を実行します。
          </p>
        )}

        {preview.data && preview.data.processTargets.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-muted">
              工程別目標（全品種実績から算出した比率）
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {preview.data.processTargets.map((pt) => (
                <div key={pt.processName} className="contents">
                  <dt className="text-muted">
                    {pt.processName}
                    <span className="ml-1 text-[11px]">
                      ({Math.round(pt.ratio * 1000) / 10}%)
                    </span>
                  </dt>
                  <dd className="tabular-nums">{pt.targetHours} h</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium text-muted">過去実績参照</p>
          {preview.isLoading && canPreview ? (
            <Skeleton className="h-24" />
          ) : preview.data && preview.data.regressionSamples.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted">
                    <th className="py-2 pr-3">工番</th>
                    <th className="pr-3">品種</th>
                    <th className="pr-3">橋梁名</th>
                    <th className="pr-3">班</th>
                    <th className="pr-3">t</th>
                    <th className="pr-3">M</th>
                    <th className="pr-3">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.data.regressionSamples.map((row) => (
                    <tr key={row.id} className="border-b border-border/50">
                      <td className="py-2 pr-3">{row.projectNumber}</td>
                      <td className="pr-3">{row.productTypeName}</td>
                      <td className="pr-3">{row.bridgeName ?? "—"}</td>
                      <td className="pr-3">{formatTeamLabel(row.teamName)}</td>
                      <td className="pr-3 tabular-nums">{row.weight}</td>
                      <td className="pr-3 tabular-nums">{row.memberLength}</td>
                      <td className="pr-3 tabular-nums">{row.totalHours} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : preview.data ? (
            <p className="text-sm text-muted">
              今回の回帰計算に使用した過去実績はありません。
            </p>
          ) : (
            <p className="text-sm text-muted">
              回帰計算後に、使用した過去実績がここに表示されます。
            </p>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </SlidePanel>
  );
}
