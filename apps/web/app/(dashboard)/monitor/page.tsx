"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson } from "@/lib/api";
import { Activity, Phone, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type ActiveCall = {
  callSid: string;
  tenantId: string;
  callerNumber: string;
  scenarioId: string;
  startedAt: number;
  transcript: string;
  status: string;
};

function useElapsed(startedAt: number): string {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, Math.floor((now - startedAt) / 1000));
  const m = String(Math.floor(diff / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function CallCard({ call }: { call: ActiveCall }) {
  const elapsed = useElapsed(call.startedAt);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [call.transcript]);

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono text-sm font-medium text-text">
            {call.callerNumber || "不明"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm tabular-nums text-muted">
            <Clock className="h-3.5 w-3.5" />
            {elapsed}
          </div>
          <Badge variant="success">通話中</Badge>
        </div>
      </div>

      {call.transcript ? (
        <div
          ref={scrollRef}
          className="mt-4 max-h-40 overflow-y-auto rounded-lg bg-surface p-3 text-sm text-muted font-mono whitespace-pre-wrap"
        >
          {call.transcript}
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-surface p-3 text-sm text-muted italic">
          文字起こし待機中…
        </div>
      )}
    </div>
  );
}

export default function MonitorPage() {
  const { data: calls, isLoading } = useQuery({
    queryKey: ["monitor", "active-calls"],
    queryFn: async () => {
      const r = await apiJson<ActiveCall[]>("/v1/monitor/active-calls-snapshot");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    refetchInterval: 3000,
  });

  const count = calls?.length ?? 0;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="通話モニタリング"
        description="リアルタイムの通話状況"
      />

      <div className="mb-5 flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted" />
        <span className="text-sm font-medium text-text">アクティブ通話</span>
        <Badge variant={count > 0 ? "success" : "neutral"}>
          {count} 件
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : count === 0 ? (
        <EmptyState title="現在進行中の通話はありません" />
      ) : (
        <div className="space-y-4">
          {calls!.map((call) => (
            <CallCard key={call.callSid} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}
