"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Info } from "lucide-react";
import { CATEGORY_LABELS, calculatePastAverageHours } from "@logivoice/shared";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createProject,
  fetchProductTypes,
  fetchScheduleModel,
  fetchTeams,
  previewScheduleForNewProject,
} from "@/lib/load-api";
import { formatTeamLabel } from "@/lib/team-label";

const selectClassName =
  "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 p-5">
      <div>
        <h2 className="text-[13px] font-semibold text-text">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
    >
      {children}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </label>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectNumber: "",
    projectName: "",
    clientName: "",
    productTypeId: "",
    teamId: "",
    deadline: "",
    weight: "",
    memberLength: "",
    scheduleStartDate: "",
  });

  const productTypes = useQuery({
    queryKey: ["product-types"],
    queryFn: async () => {
      const r = await fetchProductTypes();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const teams = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const r = await fetchTeams();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const scheduleModel = useQuery({
    queryKey: ["schedule-model"],
    queryFn: async () => {
      const r = await fetchScheduleModel();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const selectedType = productTypes.data?.find((p) => p.id === form.productTypeId);
  const weightNum = form.weight ? Number(form.weight) : NaN;
  const memberLengthNum = form.memberLength ? Number(form.memberLength) : NaN;

  const estimatedHours = useMemo(() => {
    if (!selectedType?.regressionA || !selectedType.regressionB) return null;
    if (!Number.isFinite(weightNum) || !Number.isFinite(memberLengthNum)) return null;
    return calculatePastAverageHours(
      weightNum,
      memberLengthNum,
      selectedType.regressionA,
      selectedType.regressionB,
    );
  }, [selectedType, weightNum, memberLengthNum]);

  const preview = useQuery({
    queryKey: [
      "new-project-schedule-preview",
      form.scheduleStartDate,
      estimatedHours,
    ],
    enabled: !!form.scheduleStartDate && estimatedHours != null && estimatedHours > 0,
    queryFn: async () => {
      const r = await previewScheduleForNewProject({
        startDate: form.scheduleStartDate,
        plannedHours: estimatedHours!,
      });
      if (!r.ok) throw new Error(r.message ?? "プレビューに失敗しました");
      return r.data;
    },
  });

  const previewByProcess = useMemo(() => {
    if (!preview.data) return [];
    const map = new Map<string, { name: string; byDate: Record<string, number> }>();
    for (const row of preview.data.dailySchedule) {
      const current = map.get(row.processTypeId) ?? {
        name: row.processTypeName,
        byDate: {},
      };
      current.byDate[row.date] = row.hours;
      map.set(row.processTypeId, current);
    }
    return [...map.values()];
  }, [preview.data]);

  const previewDates = useMemo(() => {
    if (!preview.data) return [];
    return [...new Set(preview.data.dailySchedule.map((row) => row.date))].sort();
  }, [preview.data]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.scheduleStartDate && estimatedHours == null) {
      setError("工程開始日を設定する場合は、重量と部材長さを入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    const r = await createProject({
      projectNumber: form.projectNumber,
      projectName: form.projectName,
      clientName: form.clientName || undefined,
      productTypeId: form.productTypeId || undefined,
      teamId: form.teamId || undefined,
      deadline: form.deadline || undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      memberLength: form.memberLength ? Number(form.memberLength) : undefined,
      scheduleStartDate: form.scheduleStartDate || undefined,
      category: selectedType?.category,
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.message ?? r.error);
      return;
    }
    router.push(`/projects/${r.data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav
        aria-label="パンくずリスト"
        className="flex items-center gap-1 text-[13px]"
      >
        <Link href="/projects" className="text-muted transition-colors hover:text-text">
          工事一覧
        </Link>
        <ChevronRight className="h-3 w-3 text-muted/50" />
        <span className="font-medium text-text">工事登録</span>
      </nav>

      <PageHeader
        title="工事登録"
        description="モデルマスタに基づき工程予定を自動生成し、班未定で登録します"
      />

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      >
        <FormSection title="基本情報" description="工番・工事名は一覧表示に使用されます">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="projectNumber" required>
                工番
              </FieldLabel>
              <Input
                id="projectNumber"
                required
                placeholder="例: 251004"
                value={form.projectNumber}
                onChange={(e) => setForm({ ...form, projectNumber: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="clientName">客先名</FieldLabel>
              <Input
                id="clientName"
                placeholder="例: ○○建設"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="projectName" required>
              工事名
            </FieldLabel>
            <Input
              id="projectName"
              required
              placeholder="例: 養老IC 小倉高架橋P2B"
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
            />
          </div>
        </FormSection>

        <div className="border-t border-border/60" />

        <FormSection title="分類・割当">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="productTypeId">品種</FieldLabel>
              <select
                id="productTypeId"
                className={selectClassName}
                value={form.productTypeId}
                disabled={productTypes.isLoading}
                onChange={(e) => setForm({ ...form, productTypeId: e.target.value })}
              >
                <option value="">選択してください</option>
                {productTypes.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selectedType ? (
                <div className="mt-1.5">
                  <Badge variant="neutral" className="text-[11px]">
                    {CATEGORY_LABELS[selectedType.category]}
                  </Badge>
                </div>
              ) : null}
            </div>
            <div>
              <FieldLabel htmlFor="teamId">製作班</FieldLabel>
              <select
                id="teamId"
                className={selectClassName}
                value={form.teamId}
                disabled={teams.isLoading}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              >
                <option value="">未定</option>
                {teams.data
                  ?.filter((t) => t.name !== "製作班未定")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatTeamLabel(t.name)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </FormSection>

        <div className="border-t border-border/60" />

        <FormSection title="仕様・工程予定">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <FieldLabel htmlFor="deadline">納期</FieldLabel>
              <Input
                id="deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="weight">重量（t）</FieldLabel>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="memberLength">部材長さ（m）</FieldLabel>
              <Input
                id="memberLength"
                type="number"
                step="0.1"
                min="0"
                value={form.memberLength}
                onChange={(e) => setForm({ ...form, memberLength: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="scheduleStartDate" required>
                工程開始日
              </FieldLabel>
              <Input
                id="scheduleStartDate"
                type="date"
                required
                value={form.scheduleStartDate}
                onChange={(e) =>
                  setForm({ ...form, scheduleStartDate: e.target.value })
                }
              />
            </div>
          </div>

          {!scheduleModel.data ? (
            <p className="text-sm text-amber-700">
              モデルマスタが未設定です。
              <Link href="/settings" className="ml-1 text-primary hover:underline">
                設定画面
              </Link>
              で登録してください。
            </p>
          ) : null}

          {estimatedHours != null ? (
            <p className="text-sm text-muted">
              推定目標時間: <span className="font-medium text-text">{estimatedHours} h</span>
              {scheduleModel.data ? (
                <>
                  {" "}
                  · 工期 {scheduleModel.data.totalDays} 日
                </>
              ) : null}
            </p>
          ) : null}

          {preview.isLoading ? <Skeleton className="h-32" /> : null}
          {preview.data ? (
            <div className="overflow-auto rounded-md border border-border">
              <table className="min-w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-bg text-muted">
                    <th className="px-2 py-1 text-left">工程</th>
                    {previewDates.slice(0, 14).map((date) => (
                      <th key={date} className="px-1 py-1 text-center font-normal">
                        {date.slice(5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewByProcess.map((row) => (
                    <tr key={row.name} className="border-b border-border/40">
                      <td className="px-2 py-1">{row.name}</td>
                      {previewDates.slice(0, 14).map((date) => (
                        <td key={date} className="px-1 py-1 text-center tabular-nums">
                          {row.byDate[date] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-border px-2 py-1 text-[11px] text-muted">
                完了予定: {preview.data.endDate}（先頭14日を表示）
              </p>
            </div>
          ) : null}
        </FormSection>

        <div className="border-t border-border/60" />

        <div className="space-y-4 bg-bg/40 p-5">
          <div className="flex gap-2.5 rounded-md border border-border/60 bg-white px-3 py-2.5 text-xs text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <p>
              登録時にモデルマスタを自動適用し、工程予定（planned）を生成します。班は未定のまま登録され、後から割り当てできます。
            </p>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/projects")}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={saving || !scheduleModel.data} loading={saving}>
              {saving ? "登録中..." : "登録"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
