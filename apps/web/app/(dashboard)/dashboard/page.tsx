"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Summary = {
  totalCalls: number;
  completionRate: number;
  avgDuration: number;
  transferCount: number;
};

export default function DashboardPage() {
  const q = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const r = await apiJson<Summary>("/v1/dashboard/summary?period=month");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  if (q.isLoading) {
    return (
      <div>
        <PageHeader title="ダッシュボード" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (q.isError || !q.data) {
    const msg =
      q.error instanceof Error ? q.error.message : "不明なエラー";
    return (
      <EmptyState
        title="データを読み込めませんでした"
        description={`${msg} — API（${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}）が起動しているか確認してください。`}
      />
    );
  }

  const d = q.data;

  return (
    <div>
      <PageHeader title="ダッシュボード" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="今月の受電数" value={String(d.totalCalls)} />
        <KpiCard
          title="自動完結率"
          value={`${Math.round(d.completionRate * 100)}%`}
        />
        <KpiCard title="平均通話時間" value={`${d.avgDuration}秒`} />
        <KpiCard title="有人転送件数" value={String(d.transferCount)} />
      </div>
      {d.totalCalls === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="まだ通話データがありません。"
            description="電話番号を設定してシナリオを公開してみましょう。"
            action={{
              label: "電話番号を追加する",
              onClick: () => {
                window.location.href = "/numbers";
              },
            }}
          />
        </div>
      ) : (
        <div className="mt-8">
          <Link href="/numbers">
            <Button variant="outline">電話番号管理へ</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e8e5e0] bg-white p-5">
      <p className="text-xs font-medium tracking-wide text-muted">
        {title}
      </p>
      <p className="mt-3 text-2xl font-semibold text-[#1a1715]">{value}</p>
    </div>
  );
}
