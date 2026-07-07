"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Info } from "lucide-react";
import { CATEGORY_LABELS } from "@logivoice/shared";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createProject, fetchProductTypes, fetchTeams } from "@/lib/load-api";
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

  const selectedType = productTypes.data?.find((p) => p.id === form.productTypeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="mx-auto max-w-2xl space-y-6">
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
        description="基本情報を登録後、詳細画面でモデル作成と目標時間の算出を行います"
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

        <FormSection title="分類・割当" description="品種はモデル作成時の過去平均参照に使用します">
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
                <option value="">未割当</option>
                {teams.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatTeamLabel(t.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        <div className="border-t border-border/60" />

        <FormSection title="仕様・納期" description="重量・部材長さはモデル作成で目標時間の算出に使用します">
          <div className="grid gap-4 sm:grid-cols-3">
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
                placeholder="12.5"
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
                placeholder="48.0"
                value={form.memberLength}
                onChange={(e) => setForm({ ...form, memberLength: e.target.value })}
              />
            </div>
          </div>
        </FormSection>

        <div className="border-t border-border/60" />

        <div className="space-y-4 bg-bg/40 p-5">
          <div className="flex gap-2.5 rounded-md border border-border/60 bg-white px-3 py-2.5 text-xs text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <p>
              目標時間は登録後の工事詳細画面「モデル作成」で、品種・重量・部材長さから自動算出します。
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
            <Button type="submit" disabled={saving} loading={saving}>
              {saving ? "登録中..." : "登録して詳細へ"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
