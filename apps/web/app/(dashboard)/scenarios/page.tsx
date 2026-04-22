"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  id: string;
  name: string;
  status: string;
  scenarioType?: string;
  linkedNumberCount: number;
  updatedAt: string;
};

export default function ScenariosPage() {
  const q = useQuery({
    queryKey: ["scenarios", "inbound"],
    queryFn: async () => {
      const r = await apiJson<Row[]>("/v1/scenarios?type=inbound");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="シナリオ"
        action={
          <Link href="/scenarios/new">
            <Button>＋ 新規シナリオ作成</Button>
          </Link>
        }
      />

      {q.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : q.data?.length === 0 ? (
        <EmptyState
          title="まだシナリオがありません。"
          description="テンプレートから始めると簡単です。"
          action={{
            label: "新規作成",
            onClick: () => {
              window.location.href = "/scenarios/new";
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {q.data?.map((s) => (
            <Link
              key={s.id}
              href={`/scenarios/${s.id}/edit`}
              className="block rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={s.status === "published" ? "success" : "neutral"}
                >
                  {s.status === "published" ? "公開中" : "下書き"}
                </Badge>
                {s.scenarioType && (
                  <Badge variant="neutral">{s.scenarioType}</Badge>
                )}
              </div>
              <h2 className="mt-3 text-base font-semibold text-text">
                {s.name}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {s.linkedNumberCount}件の番号で利用中
              </p>
              <p className="mt-3 text-xs text-muted">
                更新: {new Date(s.updatedAt).toLocaleString("ja-JP")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
