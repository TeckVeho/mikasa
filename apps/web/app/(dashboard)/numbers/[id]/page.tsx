"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function NumberDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const q = useQuery({
    queryKey: ["number", id],
    queryFn: async () => {
      const r = await apiJson<{
        id: string;
        number: string;
        scenario: { id: string; name: string } | null;
      }>(`/v1/numbers/${id}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  if (q.isLoading) {
    return (
      <div>
        <PageHeader title="番号詳細" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return <p className="text-sm text-muted animate-pulse">見つかりません</p>;
  }

  return (
    <div>
      <PageHeader title="番号詳細" />
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="font-mono text-xl text-[#1a1715]">{q.data.number}</p>
        <p className="mt-2 text-sm text-muted">
          シナリオ:{" "}
          <span className="text-[#3d3530]">
            {q.data.scenario?.name ?? "未設定"}
          </span>
        </p>
      </div>
    </div>
  );
}
