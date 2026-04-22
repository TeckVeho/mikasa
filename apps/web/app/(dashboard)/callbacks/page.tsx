"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  id: string;
  callerNumber: string;
  preferredTime: string | null;
  status: string;
  createdAt: string;
};

export default function CallbacksPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["callbacks"],
    queryFn: async () => {
      const r = await apiJson<Row[]>("/v1/callbacks");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiJson(`/v1/callbacks/${id}/complete`, {
        method: "PATCH",
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["callbacks"] }),
  });

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="コールバック / 転送" />
      {q.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-3">発信番号</th>
                <th className="px-4 py-3">希望時間</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="px-4 py-3">{r.callerNumber}</td>
                  <td className="px-4 py-3">{r.preferredTime ?? "—"}</td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3">
                    {r.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => complete.mutate(r.id)}
                        loading={complete.isPending}
                      >
                        完了
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transfer placeholder */}
      <div className="mt-6 rounded-xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
        <p className="text-sm font-medium text-text">転送一覧</p>
        <p className="mt-1.5 text-sm text-muted">
          Gemini Live の転送ハンドオフ履歴は近日追加予定です。
        </p>
      </div>
    </div>
  );
}
