"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";

type NumberDetail = {
  id: string;
  number: string;
  scenarioId: string | null;
  scenario: { id: string; name: string } | null;
  status: string;
  monthlyCallCount: number;
};

type ScenarioRow = {
  id: string;
  name: string;
  status: string;
};

function ScenarioModal({
  numberId,
  currentScenarioId,
  onClose,
}: {
  numberId: string;
  currentScenarioId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(
    currentScenarioId,
  );

  const scenariosQ = useQuery({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const r = await apiJson<ScenarioRow[]>("/v1/scenarios");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (scenarioId: string | null) => {
      const r = await apiJson<unknown>(`/v1/numbers/${numberId}/scenario`, {
        method: "PATCH",
        body: JSON.stringify({ scenarioId }),
      });
      if (!r.ok) throw new Error((r as { ok: false; message?: string }).message ?? "エラーが発生しました");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["number", numberId] });
      onClose();
    },
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="シナリオを選択"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            loading={assignMutation.isPending}
            onClick={() => assignMutation.mutate(selectedId)}
          >
            保存
          </Button>
        </>
      }
    >
      {scenariosQ.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : scenariosQ.data?.length === 0 ? (
        <p className="text-sm text-muted">シナリオがまだありません。</p>
      ) : (
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                selectedId === null
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-primary/[0.03] text-muted-foreground"
              }`}
            >
              未設定
            </button>
          </li>
          {scenariosQ.data?.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === s.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-primary/[0.03] text-muted-foreground"
                }`}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {assignMutation.isError && (
        <p className="mt-3 text-xs text-danger">
          {(assignMutation.error as Error).message}
        </p>
      )}
    </Modal>
  );
}

export default function NumberDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);

  const q = useQuery({
    queryKey: ["number", id],
    queryFn: async () => {
      const r = await apiJson<NumberDetail>(`/v1/numbers/${id}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (currentStatus: string) => {
      const next = currentStatus === "active" ? "inactive" : "active";
      const r = await apiJson<unknown>(`/v1/numbers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) throw new Error((r as { ok: false; message?: string }).message ?? "エラーが発生しました");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["number", id] });
    },
  });

  if (q.isLoading) {
    return (
      <div>
        <PageHeader title="番号詳細" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return <p className="text-sm text-muted animate-pulse">見つかりません</p>;
  }

  const data = q.data;
  const isActive = data.status === "active";

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="番号詳細" />
      <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">
            電話番号
          </p>
          <p className="font-mono text-xl text-text">{data.number}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">
            ステータス
          </p>
          <div className="flex items-center gap-3">
            <Badge variant={isActive ? "success" : "neutral"}>
              {isActive ? "稼働中" : "停止中"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              loading={toggleStatus.isPending}
              onClick={() => toggleStatus.mutate(data.status)}
            >
              {!toggleStatus.isPending && (
                <RefreshCw size={12} className="mr-1" />
              )}
              {isActive ? "停止する" : "再開する"}
            </Button>
          </div>
          {toggleStatus.isError && (
            <p className="mt-1 text-xs text-danger">
              {(toggleStatus.error as Error).message}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">
            シナリオ
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {data.scenario?.name ?? "未設定"}
            </span>
            <button
              type="button"
              aria-label="シナリオを変更"
              onClick={() => setScenarioModalOpen(true)}
              className="rounded p-0.5 text-muted hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">
            今月の受電数
          </p>
          <p className="text-2xl font-semibold text-text">
            {data.monthlyCallCount}
            <span className="ml-1 text-sm font-normal text-muted">件</span>
          </p>
        </div>
      </div>

      {scenarioModalOpen && (
        <ScenarioModal
          numberId={id}
          currentScenarioId={data.scenarioId ?? null}
          onClose={() => setScenarioModalOpen(false)}
        />
      )}
    </div>
  );
}
