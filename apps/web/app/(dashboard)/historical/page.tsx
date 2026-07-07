"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { HistoricalAverageDto, HistoricalTeamGroupDto } from "@logivoice/shared";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createHistoricalAverage,
  deleteHistoricalAverage,
  fetchHistoricalAverages,
  fetchProductTypes,
  updateHistoricalAverage,
} from "@/lib/load-api";
import { formatTeamLabel } from "@/lib/team-label";

type FormState = {
  projectNumber: string;
  clientName: string;
  bridgeName: string;
  completedAt: string;
  manufacturingPlanned: string;
  salesPlanned: string;
  weight: string;
  assemblyPrepHours: string;
  assemblyHours: string;
  weldingHours: string;
  distortionHours: string;
  paintingHours: string;
  finishingHours: string;
  totalHours: string;
  projectCount: string;
  memberLength: string;
  weightPerMeter: string;
};

const EMPTY_FORM: FormState = {
  projectNumber: "",
  clientName: "",
  bridgeName: "",
  completedAt: "",
  manufacturingPlanned: "",
  salesPlanned: "",
  weight: "",
  assemblyPrepHours: "",
  assemblyHours: "",
  weldingHours: "",
  distortionHours: "",
  paintingHours: "",
  finishingHours: "",
  totalHours: "",
  projectCount: "",
  memberLength: "",
  weightPerMeter: "",
};

function toForm(row?: HistoricalAverageDto): FormState {
  if (!row) return EMPTY_FORM;
  return {
    projectNumber: row.projectNumber,
    clientName: row.clientName ?? "",
    bridgeName: row.bridgeName ?? "",
    completedAt: row.completedAt ?? "",
    manufacturingPlanned: row.manufacturingPlanned?.toString() ?? "",
    salesPlanned: row.salesPlanned?.toString() ?? "",
    weight: row.weight?.toString() ?? "",
    assemblyPrepHours: row.assemblyPrepHours?.toString() ?? "",
    assemblyHours: row.assemblyHours?.toString() ?? "",
    weldingHours: row.weldingHours?.toString() ?? "",
    distortionHours: row.distortionHours?.toString() ?? "",
    paintingHours: row.paintingHours?.toString() ?? "",
    finishingHours: row.finishingHours?.toString() ?? "",
    totalHours: row.totalHours?.toString() ?? "",
    projectCount: row.projectCount?.toString() ?? "",
    memberLength: row.memberLength?.toString() ?? "",
    weightPerMeter: row.weightPerMeter?.toString() ?? "",
  };
}

function parseNum(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmt(value: number | null | undefined, suffix = "") {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

function formatDisplayDate(iso: string | null) {
  if (!iso) return null;
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${Number(m)}/${Number(d)}`;
}

function RecordForm({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (form: FormState) => void;
}) {
  const field = (key: keyof FormState, label: string, type = "text") => (
    <label key={key} className="block space-y-1 text-xs">
      <span className="text-muted">{label}</span>
      <Input
        type={type}
        step={type === "number" ? "0.1" : undefined}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {field("projectNumber", "工番 *")}
      {field("clientName", "発注元")}
      {field("bridgeName", "橋梁名")}
      {field("completedAt", "日付", "date")}
      {field("manufacturingPlanned", "製造予定", "number")}
      {field("salesPlanned", "営業予定", "number")}
      {field("weight", "工事重量", "number")}
      {field("projectCount", "件数", "number")}
      {field("assemblyPrepHours", "組立前", "number")}
      {field("assemblyHours", "組立", "number")}
      {field("weldingHours", "溶接", "number")}
      {field("distortionHours", "歪取り", "number")}
      {field("paintingHours", "塗装", "number")}
      {field("finishingHours", "仕上げ", "number")}
      {field("totalHours", "工事時間", "number")}
      {field("memberLength", "部材長さ", "number")}
      {field("weightPerMeter", "M毎重量", "number")}
    </div>
  );
}

function payloadFromForm(form: FormState) {
  return {
    projectNumber: form.projectNumber.trim(),
    clientName: form.clientName.trim() || null,
    bridgeName: form.bridgeName.trim() || null,
    completedAt: form.completedAt || null,
    manufacturingPlanned: parseNum(form.manufacturingPlanned),
    salesPlanned: parseNum(form.salesPlanned),
    weight: parseNum(form.weight),
    assemblyPrepHours: parseNum(form.assemblyPrepHours),
    assemblyHours: parseNum(form.assemblyHours),
    weldingHours: parseNum(form.weldingHours),
    distortionHours: parseNum(form.distortionHours),
    paintingHours: parseNum(form.paintingHours),
    finishingHours: parseNum(form.finishingHours),
    totalHours: parseNum(form.totalHours),
    projectCount: parseNum(form.projectCount),
    memberLength: parseNum(form.memberLength),
    weightPerMeter: parseNum(form.weightPerMeter),
  };
}

function ProjectRecordCard({
  row,
  editing,
  onEdit,
  onDelete,
}: {
  row: HistoricalAverageDto;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (editing) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#fff8f0] shadow-sm">
      {/* ヘッダー: A列 | B列 | 班 */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-[#fff3e6] px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-6 text-sm">
          <div className="shrink-0">
            <span className="font-semibold tabular-nums">{row.projectNumber}</span>
            {row.clientName && (
              <span className="ml-2 text-muted">{row.clientName}</span>
            )}
          </div>
          <div className="min-w-0 truncate">
            <span className="font-medium">{row.bridgeName ?? "—"}</span>
            {row.completedAt && (
              <span className="ml-2 text-muted tabular-nums">
                {formatDisplayDate(row.completedAt)}
              </span>
            )}
          </div>
          <div className="shrink-0 rounded bg-white/70 px-2 py-0.5 text-xs font-medium text-muted">
            {formatTeamLabel(row.teamName)}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="outline" size="sm" onClick={onEdit}>
            編集
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            削除
          </Button>
        </div>
      </div>

      {/* 本体: 左KPI + 右工程内訳 */}
      <div className="grid md:grid-cols-[minmax(160px,200px)_1fr]">
        {/* 左: 予定・実数・比率 */}
        <div className="border-b border-border/40 p-4 md:border-b-0 md:border-r">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-3 text-muted">予定時間</td>
                <td className="py-1 text-right font-semibold tabular-nums">
                  {fmt(row.manufacturingPlanned)}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-3 text-xs text-muted">営業予定</td>
                <td className="py-1 text-right tabular-nums">{fmt(row.salesPlanned)}</td>
              </tr>
              <tr className="border-t border-border/30">
                <td className="py-1.5 pr-3 font-medium text-muted">実数時間</td>
                <td className="py-1.5 text-right text-base font-semibold tabular-nums">
                  {fmt(row.actualHours)}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-3 text-muted">比率％</td>
                <td className="py-1 text-right tabular-nums">
                  {fmt(row.manufacturingRatio, "%")}
                </td>
              </tr>
              <tr>
                <td className="py-1 pr-3 text-xs text-muted">営業比</td>
                <td className="py-1 text-right tabular-nums">
                  {fmt(row.salesRatio, "%")}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 space-y-1 border-t border-border/30 pt-3 text-xs text-muted">
            <div className="flex justify-between">
              <span>工事重量</span>
              <span className="tabular-nums text-text">
                {row.weight != null ? `${row.weight} t` : "—"}
              </span>
            </div>
            {row.memberLength != null && (
              <div className="flex justify-between">
                <span>部材長さ</span>
                <span className="tabular-nums text-text">{row.memberLength} m</span>
              </div>
            )}
            {row.weightPerMeter != null && (
              <div className="flex justify-between">
                <span>M毎重量</span>
                <span className="tabular-nums text-text">{row.weightPerMeter}</span>
              </div>
            )}
          </div>
        </div>

        {/* 右: 工程別内訳 */}
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted">
                <th className="pb-2 text-left font-normal">工程</th>
                <th className="pb-2 text-right font-normal">時間</th>
                <th className="pb-2 text-right font-normal">構成比</th>
              </tr>
            </thead>
            <tbody>
              {row.processBreakdown.map((p) => (
                <tr key={p.name} className="border-b border-border/20">
                  <td className="py-1.5">{p.name}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.hours}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.sharePercent}%</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-2">小計</td>
                <td className="py-2 text-right tabular-nums">{row.actualHours}</td>
                <td className="py-2 text-right tabular-nums text-muted">
                  {row.weight != null ? `${row.weight} t` : "—"}
                </td>
              </tr>
              <tr className="text-muted">
                <td className="py-1">工事時間</td>
                <td className="py-1 text-right tabular-nums text-text">
                  {fmt(row.totalHours)}
                </td>
                <td className="py-1 text-right tabular-nums">
                  件数 {fmt(row.projectCount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeamSection({
  group,
  productTypeId,
  onSaved,
}: {
  group: HistoricalTeamGroupDto;
  productTypeId: string;
  onSaved: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    const r = await createHistoricalAverage({
      productTypeId,
      teamId: group.teamId,
      ...payloadFromForm(form),
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.message ?? r.error);
      return;
    }
    setAdding(false);
    setForm(EMPTY_FORM);
    onSaved();
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    setError(null);
    const r = await updateHistoricalAverage(id, payloadFromForm(form));
    setSaving(false);
    if (!r.ok) {
      setError(r.message ?? r.error);
      return;
    }
    setEditingId(null);
    setForm(EMPTY_FORM);
    onSaved();
  }

  async function handleDelete(id: string) {
    if (!confirm("この過去実績を削除しますか？")) return;
    const r = await deleteHistoricalAverage(id);
    if (!r.ok) {
      setError(r.message ?? r.error);
      return;
    }
    onSaved();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {formatTeamLabel(group.teamName)}
          <span className="ml-2 text-xs font-normal text-muted">
            {group.summary.recordCount}件
          </span>
        </h3>
        {!adding && !editingId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAdding(true);
              setForm(EMPTY_FORM);
              setError(null);
            }}
          >
            追加
          </Button>
        )}
      </div>

      {group.records.length === 0 && !adding && (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          過去実績がありません
        </p>
      )}

      {group.records.map((row) => (
        <div key={row.id} className="space-y-2">
          <ProjectRecordCard
            row={row}
            editing={editingId === row.id}
            onEdit={() => {
              setEditingId(row.id);
              setAdding(false);
              setForm(toForm(row));
              setError(null);
            }}
            onDelete={() => void handleDelete(row.id)}
          />
          {editingId === row.id && (
            <div className="mt-2 rounded-lg border border-border bg-white p-4">
              <RecordForm form={form} setForm={setForm} />
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={saving} onClick={() => void handleUpdate(row.id)}>
                  {saving ? "保存中..." : "保存"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                    setError(null);
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding && (
        <div className="rounded-lg border border-border bg-white p-4">
          <RecordForm form={form} setForm={setForm} />
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={saving} onClick={() => void handleCreate()}>
              {saving ? "保存中..." : "保存"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdding(false);
                setForm(EMPTY_FORM);
                setError(null);
              }}
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export default function HistoricalPage() {
  const queryClient = useQueryClient();
  const productTypes = useQuery({
    queryKey: ["product-types"],
    queryFn: async () => {
      const r = await fetchProductTypes();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data.filter((p) => p.category === "kyotai");
    },
  });

  const [activeProductTypeId, setActiveProductTypeId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProductTypeId && productTypes.data?.[0]) {
      setActiveProductTypeId(productTypes.data[0].id);
    }
  }, [activeProductTypeId, productTypes.data]);

  const groups = useQuery({
    queryKey: ["historical-averages", activeProductTypeId],
    enabled: !!activeProductTypeId,
    queryFn: async () => {
      const r = await fetchHistoricalAverages(activeProductTypeId!);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  function handleSaved() {
    void queryClient.invalidateQueries({
      queryKey: ["historical-averages", activeProductTypeId],
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="過去実績"
        description="品種別の工事実績を班ごとに管理します"
      />

      {productTypes.isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <div className="flex gap-1 border-b border-border">
          {productTypes.data?.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveProductTypeId(p.id)}
              className={`px-3 py-2 text-[13px] ${
                activeProductTypeId === p.id
                  ? "border-b-2 border-primary font-medium text-primary"
                  : "text-muted hover:text-text"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {groups.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <div className="space-y-8">
          {groups.data?.map((group) => (
            <TeamSection
              key={group.teamId}
              group={group}
              productTypeId={activeProductTypeId!}
              onSaved={handleSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
