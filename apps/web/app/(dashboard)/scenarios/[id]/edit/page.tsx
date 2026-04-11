"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ScenarioEditor } from "@/components/scenario/ScenarioEditor";
import { apiJson } from "@/lib/api";
import type { FlowJson } from "@logivoice/shared";

export default function EditScenarioPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const q = useQuery({
    queryKey: ["scenario", id],
    queryFn: async () => {
      const r = await apiJson<{
        id: string;
        name: string;
        flowJson: FlowJson;
      }>(`/v1/scenarios/${id}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  async function onSave(name: string, flow: FlowJson) {
    const r = await apiJson(`/v1/scenarios/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, flowJson: flow }),
    });
    if (!r.ok) {
      alert(r.message ?? r.error);
      return;
    }
    router.refresh();
  }

  if (q.isLoading) return <p>読み込み中...</p>;
  if (q.isError || !q.data) return <p>読み込み失敗</p>;

  return (
    <ScenarioEditor
      initialName={q.data.name}
      initialFlow={q.data.flowJson}
      onSave={onSave}
    />
  );
}
