"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PhoneCall, PhoneForwarded, ArrowRightLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type RecentCall = {
  id: string;
  callerNumber: string;
  status: string;
  summaryText: string | null;
  durationSeconds: number | null;
  createdAt: string;
};

type OperatorSummary = {
  todayCalls: number;
  pendingCallbacks: number;
  pendingTransfers: number;
  recentCalls: RecentCall[];
};

const STATUS_BADGE: Record<string, { variant: "success" | "info" | "neutral"; label: string }> = {
  complete: { variant: "success", label: "完了" },
  transferred: { variant: "info", label: "転送" },
  abandoned: { variant: "neutral", label: "放棄" },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

function truncate(text: string | null, max: number): string {
  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function KpiCard({
  title,
  value,
  icon: Icon,
  warn,
}: {
  title: string;
  value: number;
  icon: typeof PhoneCall;
  warn?: boolean;
}) {
  const highlight = warn && value > 0;
  return (
    <div className="rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted">{title}</p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            highlight ? "bg-warning/12" : "bg-primary/10"
          }`}
        >
          <Icon className={`h-4 w-4 ${highlight ? "text-warning" : "text-primary"}`} />
        </div>
      </div>
      <p className={`mt-3 text-2xl font-semibold ${highlight ? "text-warning" : "text-text"}`}>
        {value}
      </p>
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-20" />
    </div>
  );
}

export default function OperatorPage() {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "operator-summary"],
    queryFn: async () => {
      const r = await apiJson<OperatorSummary>("/v1/dashboard/operator-summary");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="ダッシュボード" description="本日の対応状況" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map((i) => <KpiCardSkeleton key={i} />)
        ) : isError || !data ? (
          <div className="md:col-span-3 rounded-xl border border-border bg-white p-8 text-center text-sm text-muted">
            データを読み込めませんでした
          </div>
        ) : (
          <>
            <KpiCard title="本日の受電数" value={data.todayCalls} icon={PhoneCall} />
            <KpiCard title="未対応の折り返し" value={data.pendingCallbacks} icon={PhoneForwarded} warn />
            <KpiCard title="転送待ち" value={data.pendingTransfers} icon={ArrowRightLeft} warn />
          </>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white overflow-x-auto">
        <div className="p-5 pb-3">
          <p className="text-base font-medium text-text">直近の通話</p>
        </div>
        {isLoading ? (
          <div className="space-y-3 px-5 pb-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data?.recentCalls && data.recentCalls.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border text-left text-xs font-medium text-muted">
                <th className="px-5 py-2.5">日時</th>
                <th className="px-5 py-2.5">発信番号</th>
                <th className="px-5 py-2.5">通話時間</th>
                <th className="px-5 py-2.5">ステータス</th>
                <th className="px-5 py-2.5">要約</th>
              </tr>
            </thead>
            <tbody>
              {data.recentCalls.map((call) => {
                const badge = STATUS_BADGE[call.status] ?? { variant: "neutral" as const, label: call.status };
                return (
                  <tr
                    key={call.id}
                    onClick={() => router.push(`/calls/${call.id}`)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-bg"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-text">
                      {formatTime(call.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-text">
                      {call.callerNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-muted">
                      {formatDuration(call.durationSeconds)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="max-w-xs truncate px-5 py-3 text-muted">
                      {truncate(call.summaryText, 50)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-5 pb-5 text-sm text-muted">通話履歴がありません</div>
        )}
      </div>
    </div>
  );
}
