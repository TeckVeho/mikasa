"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type TenantDetail = {
  id: string;
  name: string;
  billingPlan: string;
  voiceEngine: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  createdAt: string;
  userCount: number;
  callLogCount: number;
  phoneNumberCount: number;
};

type Usage = {
  monthToDateCalls: number;
  totalMinutes: number;
};

export default function AdminTenantDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const q = useQuery({
    queryKey: ["admin", "tenant", id],
    queryFn: async () => {
      const r = await apiJson<TenantDetail>(`/v1/admin/tenants/${id}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const u = useQuery({
    queryKey: ["admin", "tenant", id, "usage"],
    queryFn: async () => {
      const r = await apiJson<Usage>(`/v1/admin/tenants/${id}/usage`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  if (q.isLoading) {
    return (
      <div>
        <PageHeader title="テナント" />
        <Skeleton className="mt-6 h-40 max-w-lg" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <p className="text-sm text-muted">テナントが見つかりません</p>
    );
  }

  const d = q.data;

  return (
    <div className="animate-fade-in-up max-w-lg space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/tenants"
          className="inline-flex items-center rounded-md px-3 py-1.5 text-sm text-muted hover:bg-primary/5 hover:text-text"
        >
          ← 一覧
        </Link>
      </div>
      <PageHeader title={d.name} />
      <div className="rounded-xl border border-border bg-white p-6 space-y-3 text-sm">
        <p className="text-xs text-muted">ID</p>
        <p className="font-mono text-xs break-all">{d.id}</p>
        <p className="pt-2 text-xs text-muted">プラン / 音声</p>
        <p>
          {d.billingPlan} / {d.voiceEngine}
        </p>
        <p className="pt-2 text-xs text-muted">件数</p>
        <p>
          ユーザー {d.userCount} / 通話ログ {d.callLogCount} / 電話番号{" "}
          {d.phoneNumberCount}
        </p>
        {u.data && (
          <p className="text-xs text-muted">
            今月: 通話 {u.data.monthToDateCalls} 件 / 合計約{" "}
            {u.data.totalMinutes} 分
          </p>
        )}
        <p className="pt-2 text-xs text-muted">メンテナンス</p>
        <p>{d.maintenanceMode ? "オン" : "オフ"}</p>
      </div>
    </div>
  );
}
