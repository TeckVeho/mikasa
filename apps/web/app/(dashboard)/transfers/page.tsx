"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { apiJson } from "@/lib/api";

type TransferHandoff = {
  id: string;
  callLogId: string | null;
  callerNumber: string;
  reason: string;
  collectedInfo: Record<string, string> | null;
  transcript: string | null;
  priority: string;
  department: string;
  status: string;
  createdAt: string;
  handledBy: string | null;
  handledNote: string;
  handledAt: string | null;
};

type User = {
  id: string;
  name: string;
};

type TransfersResponse = {
  items: TransferHandoff[];
  total: number;
  page: number;
  limit: number;
};

const STATUS_TABS = [
  { key: "", label: "全て" },
  { key: "pending", label: "未対応" },
  { key: "handled", label: "対応済み" },
  { key: "escalated", label: "エスカレーション" },
] as const;

const PRIORITY_BADGE: Record<string, { variant: "danger" | "neutral"; label: string }> = {
  high: { variant: "danger", label: "高" },
  normal: { variant: "neutral", label: "通常" },
};

const STATUS_BADGE: Record<string, { variant: "warning" | "success" | "danger"; label: string }> = {
  pending: { variant: "warning", label: "未対応" },
  handled: { variant: "success", label: "対応済み" },
  escalated: { variant: "danger", label: "エスカレーション" },
};

const DEPT_LABEL: Record<string, string> = {
  billing: "請求",
  support: "サポート",
  general: "一般",
};

function formatDatetime(iso: string): string {
  const d = new Date(iso);
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  const hh = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function TransfersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TransferHandoff | null>(null);
  const [noteText, setNoteText] = useState("");
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const r = await apiJson<User[]>("/v1/users");
      if (!r.ok) return [];
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const userMap = new Map((users ?? []).map((u) => [u.id, u.name]));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["transfers", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50", page: String(page) });
      if (statusFilter) params.set("status", statusFilter);
      const r = await apiJson<TransfersResponse>(`/v1/transfers?${params}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const r = await apiJson(`/v1/transfers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      });
      if (!r.ok) throw new Error("ステータス更新に失敗しました");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      setSelected(null);
      setNoteText("");
    },
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="転送履歴" description="AIからオペレーターへの転送一覧" />

      <div className="mb-5 inline-flex rounded-lg border border-border bg-bg p-0.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-white text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted">
          データを読み込めませんでした
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title="転送履歴がありません" description="AIからオペレーターへの転送が発生するとここに表示されます" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted">
                  <th className="px-5 py-2.5">日時</th>
                  <th className="px-5 py-2.5">発信者番号</th>
                  <th className="px-5 py-2.5">理由</th>
                  <th className="px-5 py-2.5">優先度</th>
                  <th className="px-5 py-2.5">部署</th>
                  <th className="px-5 py-2.5">ステータス</th>
                  <th className="px-5 py-2.5">担当者</th>
                  <th className="px-5 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const pBadge = PRIORITY_BADGE[item.priority] ?? { variant: "neutral" as const, label: item.priority };
                  const sBadge = STATUS_BADGE[item.status] ?? { variant: "warning" as const, label: item.status };
                  return (
                    <tr key={item.id} className="border-t border-border transition-colors hover:bg-bg">
                      <td className="whitespace-nowrap px-5 py-3 text-text">
                        {formatDatetime(item.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-text">
                        {item.callerNumber}
                      </td>
                      <td className="max-w-xs px-5 py-3 text-muted">
                        {truncate(item.reason, 40)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={pBadge.variant}>{pBadge.label}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">
                        {DEPT_LABEL[item.department] ?? item.department}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={sBadge.variant}>{sBadge.label}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">
                        {item.handledBy ? (userMap.get(item.handledBy) ?? item.handledBy) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Button variant="outline" size="sm" onClick={() => setSelected(item)}>
                          詳細
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                前へ
              </Button>
              <span className="text-xs text-muted">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                次へ
              </Button>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setNoteText(""); }}
        title="転送詳細"
        size="lg"
        footer={
          selected && selected.status === "pending" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: selected.id, status: "handled", note: noteText })}
              >
                対応済みにする
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: selected.id, status: "escalated", note: noteText })}
              >
                エスカレーション
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-muted">発信者番号</dt>
              <dd className="text-text">{selected.callerNumber}</dd>
              <dt className="font-medium text-muted">転送理由</dt>
              <dd className="text-text">{selected.reason}</dd>
              <dt className="font-medium text-muted">優先度</dt>
              <dd>
                <Badge variant={PRIORITY_BADGE[selected.priority]?.variant ?? "neutral"}>
                  {PRIORITY_BADGE[selected.priority]?.label ?? selected.priority}
                </Badge>
              </dd>
              <dt className="font-medium text-muted">部署</dt>
              <dd className="text-text">{DEPT_LABEL[selected.department] ?? selected.department}</dd>
              <dt className="font-medium text-muted">ステータス</dt>
              <dd>
                <Badge variant={STATUS_BADGE[selected.status]?.variant ?? "warning"}>
                  {STATUS_BADGE[selected.status]?.label ?? selected.status}
                </Badge>
              </dd>
              {selected.handledBy && (
                <>
                  <dt className="font-medium text-muted">対応者</dt>
                  <dd className="text-text">
                    {userMap.get(selected.handledBy) ?? selected.handledBy}
                  </dd>
                </>
              )}
              {selected.handledAt && (
                <>
                  <dt className="font-medium text-muted">対応日時</dt>
                  <dd className="text-text">{formatDatetime(selected.handledAt)}</dd>
                </>
              )}
              {selected.handledNote && (
                <>
                  <dt className="font-medium text-muted">対応メモ</dt>
                  <dd className="whitespace-pre-wrap text-text">{selected.handledNote}</dd>
                </>
              )}
            </dl>

            {selected.status === "pending" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  対応メモ（任意）
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="対応内容を入力..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-muted outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}

            {selected.collectedInfo && Object.keys(selected.collectedInfo).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted">AIヒアリング済み情報</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-bg p-3 text-sm">
                  {Object.entries(selected.collectedInfo).map(([key, val]) => (
                    <div key={key} className="contents">
                      <dt className="font-medium text-muted">{key}</dt>
                      <dd className="text-text">{val}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {selected.transcript && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted">文字起こし</p>
                <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm font-mono text-text">
                  {selected.transcript}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
