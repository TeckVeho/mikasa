"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type TenantRow = {
  id: string;
  name: string;
  billingPlan: string;
  voiceEngine: string;
  createdAt: string;
  userCount: number;
  callLogCount: number;
};

export default function AdminTenantsPage() {
  const q = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: async () => {
      const r = await apiJson<TenantRow[]>("/v1/admin/tenants");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  return (
    <div className="animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="テナント管理"
          description="導入企業の追加・一覧（プラットフォーム管理者向け）"
        />
        <Link
          href="/admin/tenants/new"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus size={16} />
          テナントを追加
        </Link>
      </div>

      {q.isLoading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : q.isError ? (
        <p className="mt-6 text-sm text-danger">
          読み込みに失敗しました（superadmin 権限が必要です）。
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-bg">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-muted">名前</th>
                <th className="px-4 py-3 text-xs font-medium text-muted">プラン</th>
                <th className="px-4 py-3 text-xs font-medium text-muted">音声</th>
                <th className="px-4 py-3 text-xs font-medium text-muted">ユーザー</th>
                <th className="px-4 py-3 text-xs font-medium text-muted">通話ログ件数</th>
                <th className="px-4 py-3 text-xs font-medium text-muted">作成日</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-bg/80"
                >
                  <td className="px-4 py-3 font-medium text-text">
                    <Link
                      href={`/admin/tenants/${row.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.billingPlan}</td>
                  <td className="px-4 py-3 text-muted">{row.voiceEngine}</td>
                  <td className="px-4 py-3 tabular-nums">{row.userCount}</td>
                  <td className="px-4 py-3 tabular-nums">{row.callLogCount}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Date(row.createdAt).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(q.data?.length ?? 0) === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              テナントがありません
            </p>
          )}
        </div>
      )}
    </div>
  );
}
