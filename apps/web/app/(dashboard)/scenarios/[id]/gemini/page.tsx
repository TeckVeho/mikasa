"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson } from "@/lib/api";
import { PersonaEditor } from "@/components/gemini/PersonaEditor";
import { RulesEditor } from "@/components/gemini/RulesEditor";
import { KnowledgeEditor } from "@/components/gemini/KnowledgeEditor";
import { ToolDefinitionEditor } from "@/components/gemini/ToolDefinitionEditor";
import { GuardRailsEditor } from "@/components/gemini/GuardRailsEditor";
import { PromptPreview } from "@/components/gemini/PromptPreview";
import { TestCallDialog } from "@/components/gemini/TestCallDialog";
import { TransferSettings } from "@/components/gemini/TransferSettings";

type GeminiScenario = {
  id: string;
  scenarioId: string;
  persona: string;
  rules: string;
  knowledge: string;
  guardRails: string;
  toolDefinitions: string;
  transferEnabled: boolean;
  transferNumber: string;
  transferNumberClaims: string;
  transferTimeout: number;
  humanFirstEnabled: boolean;
  humanFirstNumber: string;
  humanFirstTimeout: number;
};

type ScenarioDetail = {
  id: string;
  name: string;
  flowJson: unknown;
  scenarioType: string;
  description: string | null;
};

type Tab = "persona" | "rules" | "knowledge" | "guardRails" | "tools";

const TABS: { id: Tab; label: string }[] = [
  { id: "persona", label: "ペルソナ" },
  { id: "rules", label: "対話ルール" },
  { id: "knowledge", label: "業務ナレッジ" },
  { id: "guardRails", label: "ガードレール" },
  { id: "tools", label: "ツール定義" },
];

export default function GeminiSettingsPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("persona");
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [rules, setRules] = useState("");
  const [knowledge, setKnowledge] = useState("");
  const [guardRails, setGuardRails] = useState("");
  const [toolDefinitions, setToolDefinitions] = useState("");
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [transferNumber, setTransferNumber] = useState("");
  const [transferNumberClaims, setTransferNumberClaims] = useState("");
  const [transferTimeout, setTransferTimeout] = useState(30);
  const [humanFirstEnabled, setHumanFirstEnabled] = useState(false);
  const [humanFirstNumber, setHumanFirstNumber] = useState("");
  const [humanFirstTimeout, setHumanFirstTimeout] = useState(18);
  const [saved, setSaved] = useState(false);

  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [testCallOpen, setTestCallOpen] = useState(false);

  const scenarioQ = useQuery({
    queryKey: ["scenario", id],
    queryFn: async () => {
      const r = await apiJson<ScenarioDetail>(`/v1/scenarios/${id}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const q = useQuery({
    queryKey: ["gemini-scenario", id],
    queryFn: async () => {
      const r = await apiJson<GeminiScenario>(`/v1/scenarios/${id}/gemini`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  useEffect(() => {
    if (scenarioQ.data) setName(scenarioQ.data.name);
  }, [scenarioQ.data]);

  useEffect(() => {
    if (!q.data) return;
    setPersona(q.data.persona ?? "");
    setRules(q.data.rules ?? "");
    setKnowledge(q.data.knowledge ?? "");
    setGuardRails(q.data.guardRails ?? "");
    setToolDefinitions(q.data.toolDefinitions ?? "");
    setTransferEnabled(q.data.transferEnabled ?? false);
    setTransferNumber(q.data.transferNumber ?? "");
    setTransferNumberClaims(q.data.transferNumberClaims ?? "");
    setTransferTimeout(q.data.transferTimeout ?? 30);
    setHumanFirstEnabled(q.data.humanFirstEnabled ?? false);
    setHumanFirstNumber(q.data.humanFirstNumber ?? "");
    setHumanFirstTimeout(q.data.humanFirstTimeout ?? 18);
  }, [q.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("シナリオ名を入力してください");
      }

      if (scenarioQ.data) {
        const scenarioRes = await apiJson(`/v1/scenarios/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: trimmedName,
            flowJson: scenarioQ.data.flowJson,
            scenarioType: scenarioQ.data.scenarioType,
            description: scenarioQ.data.description,
          }),
        });
        if (!scenarioRes.ok) {
          throw new Error(scenarioRes.message ?? scenarioRes.error);
        }
      }

      const r = await apiJson(`/v1/scenarios/${id}/gemini`, {
        method: "PUT",
        body: JSON.stringify({
          persona,
          rules,
          knowledge,
          guardRails,
          toolDefinitions,
          transferEnabled,
          transferNumber,
          transferNumberClaims: transferNumberClaims || null,
          transferTimeout,
          humanFirstEnabled,
          humanFirstNumber: humanFirstNumber || null,
          humanFirstTimeout,
        }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gemini-scenario", id] });
      qc.invalidateQueries({ queryKey: ["scenario", id] });
      qc.invalidateQueries({ queryKey: ["scenarios"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e) => {
      window.alert(`エラー: ${e.message}`);
    },
  });

  async function handlePreview() {
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const r = await apiJson<{ systemInstruction: string }>(
        `/v1/scenarios/${id}/gemini/preview-prompt`,
        {
          method: "POST",
          body: JSON.stringify({
            persona,
            rules,
            knowledge,
            guardRails,
            toolDefinitions,
          }),
        },
      );
      if (r.ok) {
        setPreviewText(r.data.systemInstruction);
      } else {
        setPreviewText(`エラー: ${r.message ?? r.error}`);
      }
    } catch (e) {
      setPreviewText(
        `エラー: ${e instanceof Error ? e.message : "不明なエラー"}`,
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  if (scenarioQ.isLoading || q.isLoading) {
    return (
      <div className="animate-fade-in-up">
        <PageHeader title="Gemini Live 設定" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (scenarioQ.isError || q.isError) {
    return (
      <div className="animate-fade-in-up">
        <PageHeader title="Gemini Live 設定" />
        <p className="text-sm text-danger">データの読み込みに失敗しました。</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Gemini Live 設定"
        action={
          <div className="flex items-center gap-4">
            <Link
              href={`/scenarios/${id}/edit?mode=flow`}
              className="text-sm text-muted hover:text-text transition-colors"
            >
              フロー編集
            </Link>
            <Link
              href="/scenarios"
              className="flex items-center gap-1 text-sm text-muted hover:text-text transition-colors"
            >
              <ArrowLeft size={14} />
              シナリオ一覧に戻る
            </Link>
          </div>
        }
      />

      <div className="mb-6 rounded-xl border border-border bg-surface p-5">
        <label className="mb-1.5 block text-sm font-medium text-text">
          シナリオ名
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-md rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          placeholder="シナリオ名を入力"
        />
      </div>

      {/* Tab navigation */}
      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-primary/5 hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="rounded-xl border border-border bg-surface p-5">
        {activeTab === "persona" && (
          <PersonaEditor value={persona} onChange={setPersona} />
        )}
        {activeTab === "rules" && (
          <RulesEditor value={rules} onChange={setRules} />
        )}
        {activeTab === "knowledge" && (
          <KnowledgeEditor value={knowledge} onChange={setKnowledge} scenarioId={id} />
        )}
        {activeTab === "guardRails" && (
          <GuardRailsEditor value={guardRails} onChange={setGuardRails} />
        )}
        {activeTab === "tools" && (
          <ToolDefinitionEditor
            value={toolDefinitions}
            onChange={setToolDefinitions}
          />
        )}
      </div>

      {/* Transfer settings */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <TransferSettings
          enabled={transferEnabled}
          number={transferNumber}
          claimsNumber={transferNumberClaims}
          timeout={transferTimeout}
          humanFirstEnabled={humanFirstEnabled}
          humanFirstNumber={humanFirstNumber}
          humanFirstTimeout={humanFirstTimeout}
          onEnabledChange={setTransferEnabled}
          onNumberChange={setTransferNumber}
          onClaimsNumberChange={setTransferNumberClaims}
          onTimeoutChange={setTransferTimeout}
          onHumanFirstEnabledChange={setHumanFirstEnabled}
          onHumanFirstNumberChange={setHumanFirstNumber}
          onHumanFirstTimeoutChange={setHumanFirstTimeout}
        />
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <PromptPreview text={previewText} loading={previewLoading} />
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handlePreview}
          loading={previewLoading}
        >
          <Eye size={14} className="mr-1.5" />
          プレビュー
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
        >
          保存
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check size={14} />
            保存しました
          </span>
        )}
        <div className="ml-auto">
          <Button variant="outline" onClick={() => setTestCallOpen(true)}>
            <Phone size={14} className="mr-1.5" />
            テスト通話
          </Button>
        </div>
      </div>

      <TestCallDialog
        scenarioId={id}
        open={testCallOpen}
        onClose={() => setTestCallOpen(false)}
      />
    </div>
  );
}
