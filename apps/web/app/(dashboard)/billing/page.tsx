"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type Summary = {
  plan: string;
  monthToDateCalls: number;
  estimatedTwilioUsd: number;
  estimatedSttUsd: number;
  estimatedTtsUsd: number;
};

export default function BillingPage() {
  const q = useQuery({
    queryKey: ["billing", "summary"],
    queryFn: async () => {
      const r = await apiJson<Summary>("/v1/billing/summary");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="支払い・利用料" />
      {q.isLoading ? (
        <Skeleton className="h-40" />
      ) : q.data ? (
        <div className="rounded-xl border border-border bg-surface p-6 max-w-lg space-y-2 text-sm">
          <p>
            <span className="text-muted">プラン:</span> {q.data.plan}
          </p>
          <p>
            <span className="text-muted">当月通話件数:</span> {q.data.monthToDateCalls}
          </p>
          <p>
            <span className="text-muted">Twilio概算 (USD):</span>{" "}
            {q.data.estimatedTwilioUsd}
          </p>
          <p>
            <span className="text-muted">STT概算 (USD):</span> {q.data.estimatedSttUsd}
          </p>
          <p>
            <span className="text-muted">TTS概算 (USD):</span> {q.data.estimatedTtsUsd}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">読み込みに失敗しました</p>
      )}
    </div>
  );
}
