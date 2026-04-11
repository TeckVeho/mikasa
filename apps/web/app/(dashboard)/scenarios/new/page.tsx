"use client";

import { useRouter } from "next/navigation";
import { ScenarioEditor } from "@/components/scenario/ScenarioEditor";
import { apiJson } from "@/lib/api";
import type { FlowJson } from "@logivoice/shared";

export default function NewScenarioPage() {
  const router = useRouter();

  async function onSave(name: string, flow: FlowJson) {
    const r = await apiJson<{ id: string }>("/v1/scenarios", {
      method: "POST",
      body: JSON.stringify({ name, flowJson: flow }),
    });
    if (!r.ok) {
      alert(r.message ?? r.error);
      return;
    }
    router.push(`/scenarios/${r.data.id}/edit`);
  }

  return (
    <ScenarioEditor
      initialName="新規シナリオ"
      initialFlow={null}
      onSave={onSave}
    />
  );
}
