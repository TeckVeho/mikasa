"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type Row = {
  id: string;
  number: string;
  scenarioName: string | null;
  status: string;
  monthlyCallCount: number;
};

export default function NumbersPage() {
  const q = useQuery({
    queryKey: ["numbers"],
    queryFn: async () => {
      const r = await apiJson<Row[]>("/v1/numbers");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  return (
    <div>
      <PageHeader
        title="電話番号管理"
        action={
          <Button disabled title="Twilio連携後に利用可能">
            ＋ 電話番号を追加
          </Button>
        }
      />

      {q.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : q.data?.length === 0 ? (
        <EmptyState
          title="電話番号がまだありません。"
          description="Twilio で番号を取得して追加します。"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                {["電話番号", "シナリオ", "ステータス", "今月受電", "操作"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted ${i === 3 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {q.data?.map((n) => (
                <tr
                  key={n.id}
                  className="border-b border-border last:border-0 hover:bg-[#f5f0e8]/60"
                >
                  <td className="px-4 py-3 font-mono text-[#1a1715]">
                    {n.number}
                  </td>
                  <td className="px-4 py-3">
                    {n.scenarioName ?? (
                      <span className="text-muted">未設定</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={n.status === "active" ? "success" : "neutral"}
                    >
                      {n.status === "active" ? "稼働中" : "停止中"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{n.monthlyCallCount}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/numbers/${n.id}`}
                      className="text-primary hover:underline"
                    >
                      詳細
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
