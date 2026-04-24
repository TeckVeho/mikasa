"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, RefreshCw, Trash2, Plus } from "lucide-react";
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

type IvrSettings = {
  ivrEnabled: boolean;
  ivrMessage: string | null;
  routes: {
    id: string;
    digit: string;
    label: string;
    scenarioId: string;
    scenarioName: string;
    sortOrder: number;
  }[];
};

type LocalRoute = { digit: string; label: string; scenarioId: string };

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

function IvrSettingsSection({ numberId }: { numberId: string }) {
  const queryClient = useQueryClient();
  const [ivrEnabled, setIvrEnabled] = useState(false);
  const [ivrMessage, setIvrMessage] = useState("");
  const [routes, setRoutes] = useState<LocalRoute[]>([]);
  const [ivrSaved, setIvrSaved] = useState(false);

  const ivrQuery = useQuery({
    queryKey: ["number-ivr", numberId],
    queryFn: async () => {
      const r = await apiJson<IvrSettings>(`/v1/numbers/${numberId}/ivr`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const scenariosQ = useQuery({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const r = await apiJson<ScenarioRow[]>("/v1/scenarios");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  useEffect(() => {
    if (ivrQuery.data) {
      setIvrEnabled(ivrQuery.data.ivrEnabled);
      setIvrMessage(ivrQuery.data.ivrMessage ?? "");
      setRoutes(
        ivrQuery.data.routes
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((r) => ({ digit: r.digit, label: r.label, scenarioId: r.scenarioId })),
      );
    }
  }, [ivrQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = await apiJson<unknown>(`/v1/numbers/${numberId}/ivr`, {
        method: "PUT",
        body: JSON.stringify({ ivrEnabled, ivrMessage, routes }),
      });
      if (!r.ok)
        throw new Error(
          (r as { ok: false; message?: string }).message ?? "エラーが発生しました",
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["number-ivr", numberId] });
      setIvrSaved(true);
      setTimeout(() => setIvrSaved(false), 3000);
    },
  });

  const usedDigits = new Set(routes.map((r) => r.digit));

  const addRoute = () => {
    if (routes.length >= 9) return;
    const next = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].find(
      (d) => !usedDigits.has(d),
    );
    if (!next) return;
    setRoutes([...routes, { digit: next, label: "", scenarioId: "" }]);
  };

  const removeRoute = (index: number) => {
    setRoutes(routes.filter((_, i) => i !== index));
  };

  const updateRoute = (index: number, patch: Partial<LocalRoute>) => {
    setRoutes(routes.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  if (ivrQuery.isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-10" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
      <h3 className="text-sm font-semibold text-text">IVR メニュー設定</h3>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={ivrEnabled}
          onClick={() => setIvrEnabled(!ivrEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            ivrEnabled ? "bg-primary" : "bg-muted/30"
          }`}
        >
          <span
            className={`absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              ivrEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-sm text-text">IVRを有効にする</span>
      </div>

      {ivrEnabled && (
        <>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">
              ガイダンスメッセージ
            </p>
            <textarea
              value={ivrMessage}
              onChange={(e) => setIvrMessage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
              placeholder="例: お電話ありがとうございます。ご用件に合わせて番号を押してください。"
            />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">
              ルーティング
            </p>

            {routes.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[3rem_1fr_1fr_2.5rem] gap-px bg-border">
                  <div className="bg-surface-alt px-2 py-1.5 text-xs font-medium text-muted">
                    キー
                  </div>
                  <div className="bg-surface-alt px-2 py-1.5 text-xs font-medium text-muted">
                    ラベル
                  </div>
                  <div className="bg-surface-alt px-2 py-1.5 text-xs font-medium text-muted">
                    シナリオ
                  </div>
                  <div className="bg-surface-alt" />
                </div>
                {routes.map((route, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[3rem_1fr_1fr_2.5rem] gap-px bg-border"
                  >
                    <div className="bg-surface flex items-center justify-center">
                      <select
                        value={route.digit}
                        onChange={(e) =>
                          updateRoute(idx, { digit: e.target.value })
                        }
                        className="w-full bg-transparent text-center text-sm text-text py-1.5 focus:outline-none"
                      >
                        {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                          (d) => (
                            <option
                              key={d}
                              value={d}
                              disabled={d !== route.digit && usedDigits.has(d)}
                            >
                              {d}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div className="bg-surface flex items-center">
                      <input
                        type="text"
                        value={route.label}
                        onChange={(e) =>
                          updateRoute(idx, { label: e.target.value })
                        }
                        placeholder="ラベル"
                        className="w-full bg-transparent px-2 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none"
                      />
                    </div>
                    <div className="bg-surface flex items-center">
                      <select
                        value={route.scenarioId}
                        onChange={(e) =>
                          updateRoute(idx, { scenarioId: e.target.value })
                        }
                        className="w-full bg-transparent px-2 py-1.5 text-sm text-text focus:outline-none"
                      >
                        <option value="">選択してください</option>
                        {scenariosQ.data?.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-surface flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeRoute(idx)}
                        className="rounded p-1 text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                        aria-label="ルートを削除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {routes.length < 9 && (
              <button
                type="button"
                onClick={addRoute}
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <Plus size={14} />
                ルートを追加
              </button>
            )}
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-3">
        {ivrSaved && (
          <span className="text-sm text-success">保存しました ✓</span>
        )}
        <Button
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          保存
        </Button>
      </div>

      {saveMutation.isError && (
        <p className="text-xs text-danger">
          {(saveMutation.error as Error).message}
        </p>
      )}
    </div>
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

      <div className="mt-6">
        <IvrSettingsSection numberId={id} />
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
