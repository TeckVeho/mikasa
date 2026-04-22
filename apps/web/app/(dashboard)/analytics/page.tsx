"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type Voc = {
  topics: string[];
  faqCandidates: string[];
  sentiment: string;
};

export default function AnalyticsPage() {
  const q = useQuery({
    queryKey: ["voc", "summary"],
    queryFn: async () => {
      const r = await apiJson<Voc>("/v1/voc/summary");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="VOC 分析" />
      {q.isLoading ? (
        <Skeleton className="h-48" />
      ) : q.data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-medium text-text">トピック</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted">
              {q.data.topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-medium text-text">FAQ候補</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted">
              {q.data.faqCandidates.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 md:col-span-2">
            <p className="text-sm text-muted">
              雰囲気: <span className="text-text font-medium">{q.data.sentiment}</span>
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">データがありません</p>
      )}
    </div>
  );
}
