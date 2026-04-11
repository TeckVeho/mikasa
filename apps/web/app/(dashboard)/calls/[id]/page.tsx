"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

const textareaClass =
  "mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[#1a1715] placeholder:text-muted outline-none transition-shadow focus:ring-2 focus:ring-primary/30";

export default function CallDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const q = useQuery({
    queryKey: ["call", id],
    queryFn: async () => {
      const r = await apiJson<{
        id: string;
        callerNumber: string;
        transcriptText: string | null;
        summaryText: string | null;
        operatorNote: string;
        status: string;
      }>(`/v1/calls/${id}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const r = await apiJson(`/v1/calls/${id}/note`, {
        method: "PATCH",
        body: JSON.stringify({ operatorNote: note }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call", id] }),
  });

  useEffect(() => {
    if (q.data?.operatorNote !== undefined) {
      setNote(q.data.operatorNote);
    }
  }, [q.data?.operatorNote]);

  if (q.isLoading) {
    return (
      <div>
        <PageHeader title="通話詳細" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <p className="text-sm text-muted animate-pulse">見つかりません</p>
    );
  }

  return (
    <div>
      <PageHeader title="通話詳細" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-[#1a1715]">文字起こし</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-muted leading-relaxed">
            {q.data.transcriptText ?? "（なし）"}
          </pre>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-[#1a1715]">AI 要約</h2>
          <p className="mt-3 text-sm text-[#3d3530] leading-relaxed">
            {q.data.summaryText ?? "—"}
          </p>
          <h2 className="mt-6 text-sm font-semibold text-[#1a1715]">
            オペレーターメモ
          </h2>
          <textarea
            className={textareaClass}
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="メモを入力..."
          />
          <Button
            className="mt-3"
            size="sm"
            onClick={() => save.mutate()}
            loading={save.isPending}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
