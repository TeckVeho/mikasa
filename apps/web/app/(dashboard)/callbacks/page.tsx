"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PhoneForwarded,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { apiJson } from "@/lib/api";

type CallbackRow = {
  id: string;
  callerNumber: string;
  preferredTime: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  assigneeId: string | null;
  note: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type StatusTab = "all" | "pending" | "completed" | "no_answer";

const TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "全て" },
  { key: "pending", label: "未対応" },
  { key: "completed", label: "完了" },
  { key: "no_answer", label: "不在" },
];

function isUrgent(preferredTime: string | null): boolean {
  if (!preferredTime) return false;
  const lower = preferredTime.toLowerCase();
  return lower.includes("本日") || lower.includes("今日") || lower.includes("至急") || lower.includes("緊急");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CallbacksPage() {
  const [tab, setTab] = useState<StatusTab>("all");
  const [actionRow, setActionRow] = useState<{ id: string; type: "complete" | "no_answer" } | null>(null);
  const [noteText, setNoteText] = useState("");
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["callbacks", tab],
    queryFn: async () => {
      const r = await apiJson<CallbackRow[]>(
        `/v1/callbacks${tab !== "all" ? `?status=${tab}` : ""}`,
      );
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const r = await apiJson<UserRow[]>("/v1/users");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const usersMap = new Map((usersQ.data ?? []).map((u) => [u.id, u]));

  const assignMut = useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string }) => {
      const r = await apiJson(`/v1/callbacks/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigneeId }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["callbacks"] }),
  });

  const completeMut = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const r = await apiJson(`/v1/callbacks/${id}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => {
      setActionRow(null);
      setNoteText("");
      qc.invalidateQueries({ queryKey: ["callbacks"] });
    },
  });

  const noAnswerMut = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const r = await apiJson(`/v1/callbacks/${id}/no-answer`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => {
      setActionRow(null);
      setNoteText("");
      qc.invalidateQueries({ queryKey: ["callbacks"] });
    },
  });

  const rows = q.data ?? [];
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const todayCompletedCount = rows.filter((r) => {
    if (r.status !== "completed" || !r.completedAt) return false;
    const d = new Date(r.completedAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }).length;

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="折り返し対応" description="折り返し電話の管理" />

      {/* Stats */}
      <div className="mb-4 flex items-center gap-6 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-warning" />
          未対応 <span className="font-semibold text-text">{q.isLoading ? "–" : pendingCount}</span>件
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-success" />
          本日完了 <span className="font-semibold text-text">{q.isLoading ? "–" : todayCompletedCount}</span>件
        </span>
      </div>

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-lg border border-border bg-bg p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {t.label}
            {t.key === "pending" && !q.isLoading && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/15 px-1.5 text-xs font-semibold text-warning">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {q.isLoading ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="折り返し対応はありません"
          description="新しい折り返しリクエストが登録されるとここに表示されます"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium text-muted">発信番号</th>
                <th className="px-4 py-3 font-medium text-muted">希望時間</th>
                <th className="px-4 py-3 font-medium text-muted">登録日時</th>
                <th className="px-4 py-3 font-medium text-muted">担当者</th>
                <th className="px-4 py-3 font-medium text-muted">ステータス</th>
                <th className="px-4 py-3 font-medium text-muted">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isActioning = actionRow?.id === r.id;
                const assignee = r.assigneeId ? usersMap.get(r.assigneeId) : null;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-border last:border-b-0 ${
                      r.status === "pending" ? "border-l-2 border-l-warning" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${r.callerNumber.replace(/[-\s]/g, "")}`}
                        className="font-mono text-primary hover:underline"
                      >
                        <PhoneForwarded className="mr-1.5 inline-block h-3.5 w-3.5" />
                        {r.callerNumber}
                      </a>
                      {r.note && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-muted">
                          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                          {r.note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.preferredTime ? (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted" />
                          {r.preferredTime}
                          {isUrgent(r.preferredTime) && (
                            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                              緊急
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">指定なし</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" ? (
                        <select
                          className="rounded-lg border border-border bg-white px-2 py-1 text-sm text-text focus:border-primary focus:outline-none"
                          value={r.assigneeId ?? ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              assignMut.mutate({ id: r.id, assigneeId: e.target.value });
                            }
                          }}
                        >
                          <option value="">未割当</option>
                          {(usersQ.data ?? []).map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      ) : assignee ? (
                        <span className="text-sm text-text">{assignee.name}</span>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <Badge variant="warning">未対応</Badge>
                      )}
                      {r.status === "completed" && (
                        <Badge variant="success">完了</Badge>
                      )}
                      {r.status === "no_answer" && (
                        <Badge variant="neutral">不在</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && !isActioning && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setActionRow({ id: r.id, type: "complete" }); setNoteText(""); }}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            完了
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setActionRow({ id: r.id, type: "no_answer" }); setNoteText(""); }}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            不在
                          </Button>
                        </div>
                      )}
                      {isActioning && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="対応メモ（任意）"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="h-8 w-40 rounded-lg border border-border bg-white px-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Escape") { setActionRow(null); setNoteText(""); }
                              if (e.key === "Enter") {
                                const payload = { id: r.id, note: noteText || undefined };
                                if (actionRow.type === "complete") completeMut.mutate(payload);
                                else noAnswerMut.mutate(payload);
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="primary"
                            loading={completeMut.isPending || noAnswerMut.isPending}
                            onClick={() => {
                              const payload = { id: r.id, note: noteText || undefined };
                              if (actionRow.type === "complete") completeMut.mutate(payload);
                              else noAnswerMut.mutate(payload);
                            }}
                          >
                            {actionRow.type === "complete" ? "完了" : "不在"}確定
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setActionRow(null); setNoteText(""); }}
                          >
                            取消
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
