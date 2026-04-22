"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ScenarioEditor } from "@/components/scenario/ScenarioEditor";
import { ScenarioFormEditor } from "@/components/scenario/ScenarioFormEditor";
import { apiJson } from "@/lib/api";
import type { FlowJson } from "@logivoice/shared";
import { Button } from "@/components/ui/button";

type TenantInfo = {
  voiceEngine?: string;
};

type ScenarioDetail = {
  id: string;
  name: string;
  flowJson: FlowJson;
  scenarioType: string;
  description: string | null;
  status: string;
};

type VersionRow = {
  id: string;
  version: number;
  publishedAt: string;
};

export default function EditScenarioPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();
  const forceFlow = searchParams.get("mode") === "flow";

  const [tab, setTab] = useState<"flow" | "form">("flow");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [localFlow, setLocalFlow] = useState<FlowJson | null>(null);
  const [flowKey, setFlowKey] = useState(0);

  const tenantQ = useQuery({
    queryKey: ["settings", "tenant"],
    queryFn: async () => {
      const r = await apiJson<TenantInfo>("/v1/settings/tenant");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  useEffect(() => {
    if (!forceFlow && tenantQ.data?.voiceEngine === "gemini_live") {
      router.replace(`/scenarios/${id}/gemini`);
    }
  }, [forceFlow, tenantQ.data?.voiceEngine, id, router]);

  const q = useQuery({
    queryKey: ["scenario", id],
    queryFn: async () => {
      const r = await apiJson<ScenarioDetail>(`/v1/scenarios/${id}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const versionsQ = useQuery({
    queryKey: ["scenario", id, "versions"],
    queryFn: async () => {
      const r = await apiJson<VersionRow[]>(`/v1/scenarios/${id}/versions`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  useEffect(() => {
    if (q.data) {
      setName(q.data.name);
      setDescription(q.data.description ?? "");
      setLocalFlow(q.data.flowJson);
    }
  }, [q.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      flowJson: FlowJson;
      scenarioType: string;
      description: string | null;
    }) => {
      const r = await apiJson(`/v1/scenarios/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenario", id] });
      qc.invalidateQueries({ queryKey: ["scenarios"] });
      router.refresh();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const r = await apiJson(`/v1/scenarios/${id}/publish`, {
        method: "POST",
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenario", id] });
      qc.invalidateQueries({ queryKey: ["scenario", id, "versions"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (version: number) => {
      const r = await apiJson(`/v1/scenarios/${id}/restore-version`, {
        method: "POST",
        body: JSON.stringify({ version }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenario", id] });
      setFlowKey((k) => k + 1);
    },
  });

  async function onSave(n: string, flow: FlowJson) {
    setLocalFlow(flow);
    await saveMutation.mutateAsync({
      name: n,
      flowJson: flow,
      scenarioType: "inbound",
      description: description || null,
    });
  }

  if (
    tenantQ.isLoading ||
    (!forceFlow && tenantQ.data?.voiceEngine === "gemini_live")
  )
    return <p className="p-4">読み込み中...</p>;
  if (q.isLoading || !localFlow) return <p className="p-4">読み込み中...</p>;
  if (q.isError || !q.data) return <p className="p-4">読み込み失敗</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <label className="text-sm flex-1 min-w-[200px]">
          <span className="text-muted text-xs">説明</span>
          <input
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="シナリオの説明"
          />
        </label>
        <div className="flex rounded-lg border border-border p-0.5 bg-bg">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === "flow" ? "bg-white shadow-sm" : "text-muted"
            }`}
            onClick={() => setTab("flow")}
          >
            フローエディタ
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === "form" ? "bg-white shadow-sm" : "text-muted"
            }`}
            onClick={() => setTab("form")}
          >
            フォーム編集
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => publishMutation.mutate()}
          loading={publishMutation.isPending}
        >
          公開
        </Button>
      </div>

      {versionsQ.data && versionsQ.data.length > 0 && (
        <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm">
          <span className="font-medium text-text">公開履歴（ロールバック）</span>
          <ul className="mt-2 flex flex-wrap gap-2">
            {versionsQ.data.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface"
                  onClick={() => {
                    if (
                      confirm(`バージョン ${v.version} に戻しますか？`)
                    ) {
                      restoreMutation.mutate(v.version);
                    }
                  }}
                >
                  v{v.version}（
                  {new Date(v.publishedAt).toLocaleString("ja-JP")}）
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "flow" ? (
        <ScenarioEditor
          key={flowKey}
          initialName={name}
          initialFlow={localFlow}
          name={name}
          onNameChange={setName}
          onSave={onSave}
        />
      ) : (
        <ScenarioFormEditor
          flowJson={localFlow}
          onApply={(next) => {
            setLocalFlow(next);
            setFlowKey((k) => k + 1);
          }}
        />
      )}

      {tab === "form" && (
        <div className="flex flex-wrap items-center gap-3 px-1">
          <Button
            type="button"
            onClick={() =>
              saveMutation.mutate({
                name,
                flowJson: localFlow,
                scenarioType: "inbound",
                description: description || null,
              })
            }
            loading={saveMutation.isPending}
          >
            サーバーに保存
          </Button>
          <p className="text-xs text-muted">
            まず「フローに反映」でプレビューを更新し、確定したら保存してください。
          </p>
        </div>
      )}
    </div>
  );
}
