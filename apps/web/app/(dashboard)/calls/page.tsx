"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type Item = {
  id: string;
  callerNumber: string;
  duration: number | null;
  status: string;
  summaryText: string | null;
  createdAt: string;
};

export default function CallsPage() {
  const q = useQuery({
    queryKey: ["calls"],
    queryFn: async () => {
      const r = await apiJson<{
        items: Item[];
        total: number;
      }>("/v1/calls?limit=50&page=1");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  return (
    <div>
      <PageHeader title="通話ログ" />

      {q.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : q.data?.items.length === 0 ? (
        <EmptyState
          title="まだ通話ログがありません。"
          description="電話番号を設定してシナリオを公開すると通話が記録されます。"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                {["日時", "発信番号", "時間", "ステータス", "要約"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data?.items.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-[#f5f0e8]/60"
                >
                  <td className="px-4 py-3 text-[#1a1715]">
                    {new Date(c.createdAt).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 font-mono">{c.callerNumber}</td>
                  <td className="px-4 py-3">{c.duration ?? "-"}秒</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="max-w-xs truncate px-4 py-3">
                    <Link
                      href={`/calls/${c.id}`}
                      className="text-primary hover:underline"
                    >
                      {(c.summaryText ?? "詳細を見る").slice(0, 50)}
                    </Link>
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

function StatusBadge({ status }: { status: string }) {
  if (status === "complete") return <Badge variant="success">完結</Badge>;
  if (status === "transferred") return <Badge variant="info">転送</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}
