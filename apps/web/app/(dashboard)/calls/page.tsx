"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Volume2 } from "lucide-react";

type Item = {
  id: string;
  callerNumber: string;
  receiverNumber?: string;
  duration: number | null;
  status: string;
  hasAudio: boolean;
  summaryText: string | null;
  createdAt: string;
};

type CallsResponse = {
  items: Item[];
  total: number;
  page: number;
  limit: number;
};

const INPUT_CLASS =
  "rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30";

const STATUS_OPTIONS = [
  { value: "", label: "全て" },
  { value: "complete", label: "完結" },
  { value: "transferred", label: "転送" },
  { value: "abandoned", label: "途中切断" },
];

const LIMIT = 50;

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return toDateStr(d);
}

function defaultTo() {
  return toDateStr(new Date());
}

export default function CallsPage() {
  const router = useRouter();

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  function handleReset() {
    setFrom(defaultFrom());
    setTo(defaultTo());
    setStatus("");
    setQ("");
    setDebouncedQ("");
    setPage(1);
  }

  const query = useQuery({
    queryKey: ["calls", { from, to, status, q: debouncedQ, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        page: String(page),
        from,
        to,
      });
      if (status) params.set("status", status);
      if (debouncedQ) params.set("q", debouncedQ);
      const r = await apiJson<CallsResponse>(`/v1/calls?${params.toString()}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const total = query.data?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const end = Math.min(page * LIMIT, total);
  const hasNext = end < total;
  const hasPrev = page > 1;

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="通話ログ" />

      {/* フィルターバー */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">開始日</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">終了日</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">ステータス</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className={INPUT_CLASS}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">キーワード</label>
          <input
            type="text"
            placeholder="検索..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${INPUT_CLASS} w-48`}
          />
        </div>
        <button
          onClick={handleReset}
          className="pb-0.5 text-sm text-muted hover:text-text underline-offset-2 hover:underline transition-colors"
        >
          フィルタをリセット
        </button>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : query.data?.items.length === 0 ? (
        <EmptyState
          title="通話ログが見つかりません。"
          description="条件を変更して再度お試しください。"
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  {["日時", "発信番号", "受信番号", "通話時間", "ステータス", "録音", "要約"].map((h) => (
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
                {query.data?.items.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/calls/${c.id}`)}
                    className="border-b border-border last:border-0 hover:bg-primary/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-text whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 font-mono">{c.callerNumber}</td>
                    <td className="px-4 py-3 font-mono">{c.receiverNumber ?? "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.duration != null ? `${c.duration}秒` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      {c.hasAudio && <Volume2 className="inline-block h-4 w-4 text-primary" />}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted">
                      {(c.summaryText ?? "—").slice(0, 50)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          <div className="mt-4 flex items-center justify-end gap-4">
            <span className="text-sm text-muted">
              {start}-{end} / {total}件
            </span>
            <div className="flex gap-2">
              <button
                disabled={!hasPrev}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-bg disabled:cursor-not-allowed transition-colors"
              >
                前へ
              </button>
              <button
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-bg disabled:cursor-not-allowed transition-colors"
              >
                次へ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "complete") return <Badge variant="success">完結</Badge>;
  if (status === "transferred") return <Badge variant="info">転送</Badge>;
  if (status === "abandoned") return <Badge variant="neutral">途中切断</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}
