"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bot, Sparkles } from "lucide-react";
import { ScenarioEditor } from "@/components/scenario/ScenarioEditor";
import { FlowWizardChat, type FlowWizardResult } from "@/components/scenario/FlowWizardChat";
import { NewGeminiScenario } from "@/components/gemini/NewGeminiScenario";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/api";
import type { FlowJson } from "@logivoice/shared";

type TenantInfo = {
  voiceEngine?: string;
};

export default function NewScenarioPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "wizard">("manual");
  const [wizardFlow, setWizardFlow] = useState<FlowJson | null>(null);
  const [wizardName, setWizardName] = useState("新規シナリオ");
  const [flowKey, setFlowKey] = useState(0);

  const tenantQ = useQuery({
    queryKey: ["settings", "tenant"],
    queryFn: async () => {
      const r = await apiJson<TenantInfo>("/v1/settings/tenant");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const isGeminiLive = tenantQ.data?.voiceEngine === "gemini_live";

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

  function handleWizardComplete(result: FlowWizardResult) {
    setWizardName(result.suggestedName);
    setWizardFlow(result.flowJson);
    setFlowKey((k) => k + 1);
    setMode("manual");
  }

  if (tenantQ.isLoading) return <p className="p-4">読み込み中...</p>;

  if (isGeminiLive) return <NewGeminiScenario />;

  if (mode === "wizard") {
    return (
      <FlowWizardChat
        onComplete={handleWizardComplete}
        onCancel={() => setMode("manual")}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* AI Assistant Banner */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bot size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-text">AIアシスタントで作成</p>
            <p className="text-xs text-muted">対話形式でフローを自動生成し、そのまま編集できます</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setMode("wizard")}>
          <Sparkles size={14} className="mr-1.5" />
          試してみる
        </Button>
      </div>

      {/* Scenario Editor */}
      <div className="min-h-0 flex-1">
        <ScenarioEditor
          key={flowKey}
          initialName={wizardName}
          initialFlow={wizardFlow}
          onSave={onSave}
        />
      </div>
    </div>
  );
}
