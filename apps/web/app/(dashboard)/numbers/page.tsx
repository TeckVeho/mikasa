"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";

type NumberRow = {
  id: string;
  number: string;
  scenarioId: string | null;
  scenarioName: string | null;
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
      queryClient.invalidateQueries({ queryKey: ["numbers"] });
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
                  : "hover:bg-[#f5f0e8]/60 text-[#3d3530]"
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
                    : "hover:bg-[#f5f0e8]/60 text-[#3d3530]"
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

function AddNumberModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="電話番号を追加"
      footer={
        <Button variant="secondary" onClick={onClose}>
          閉じる
        </Button>
      }
    >
      <p className="text-sm text-[#3d3530]">
        Twilio連携が必要です。設定画面でAPIキーを登録してください。
      </p>
      <div className="mt-4">
        <Link
          href="/settings"
          className="text-sm font-medium text-primary hover:underline"
          onClick={onClose}
        >
          設定画面へ →
        </Link>
      </div>
    </Modal>
  );
}

export default function NumbersPage() {
  const queryClient = useQueryClient();
  const [scenarioModal, setScenarioModal] = useState<NumberRow | null>(null);
  const [addNumberOpen, setAddNumberOpen] = useState(false);

  const q = useQuery({
    queryKey: ["numbers"],
    queryFn: async () => {
      const r = await apiJson<NumberRow[]>("/v1/numbers");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({
      id,
      currentStatus,
    }: {
      id: string;
      currentStatus: string;
    }) => {
      const next = currentStatus === "active" ? "inactive" : "active";
      const r = await apiJson<unknown>(`/v1/numbers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) throw new Error((r as { ok: false; message?: string }).message ?? "エラーが発生しました");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["numbers"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="電話番号管理"
        action={
          <Button onClick={() => setAddNumberOpen(true)}>
            ＋ 電話番号を追加
          </Button>
        }
      />

      {q.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : q.data?.length === 0 ? (
        <EmptyState
          title="電話番号がまだありません。"
          description="Twilio で番号を取得して追加します。"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                {["電話番号", "シナリオ", "ステータス", "今月受電", "操作"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted ${i === 3 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {q.data?.map((n) => {
                const isToggling =
                  toggleStatus.isPending &&
                  toggleStatus.variables?.id === n.id;
                return (
                  <tr
                    key={n.id}
                    className="border-b border-border last:border-0 hover:bg-[#f5f0e8]/60"
                  >
                    <td className="px-4 py-3 font-mono text-[#1a1715]">
                      {n.number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span
                          className={n.scenarioName ? "text-[#3d3530]" : "text-muted"}
                        >
                          {n.scenarioName ?? "未設定"}
                        </span>
                        <button
                          type="button"
                          aria-label="シナリオを変更"
                          onClick={() => setScenarioModal(n)}
                          className="rounded p-0.5 text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={n.status === "active" ? "success" : "neutral"}
                      >
                        {n.status === "active" ? "稼働中" : "停止中"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {n.monthlyCallCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          loading={isToggling}
                          onClick={() =>
                            toggleStatus.mutate({
                              id: n.id,
                              currentStatus: n.status,
                            })
                          }
                        >
                          {!isToggling && (
                            <RefreshCw size={12} className="mr-1" />
                          )}
                          {n.status === "active" ? "停止" : "再開"}
                        </Button>
                        <Link
                          href={`/numbers/${n.id}`}
                          className="text-primary hover:underline text-sm"
                        >
                          詳細
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {scenarioModal && (
        <ScenarioModal
          numberId={scenarioModal.id}
          currentScenarioId={scenarioModal.scenarioId}
          onClose={() => setScenarioModal(null)}
        />
      )}

      {addNumberOpen && (
        <AddNumberModal onClose={() => setAddNumberOpen(false)} />
      )}
    </div>
  );
}
