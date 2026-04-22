"use client";

import { useMemo, useState, useEffect } from "react";
import type { FlowJson } from "@logivoice/shared";
import { Button } from "@/components/ui/button";

type StepKind = "speak" | "listen" | "branch" | "other";

type FormStep = {
  id: string;
  kind: StepKind;
  /** speak */
  text?: string;
  /** listen */
  variableName?: string;
  timeoutSeconds?: number;
  /** branch */
  branchLabels?: string;
};

function flowToSteps(flow: FlowJson): FormStep[] {
  const nodes = flow.nodes ?? [];
  const edges = flow.edges ?? [];
  if (nodes.length === 0) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const entry =
    nodes.find((n) => !edges.some((e) => e.target === n.id)) ?? nodes[0];
  if (!entry) return [];

  const steps: FormStep[] = [];
  const seen = new Set<string>();
  let cur: string | null = entry.id;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const n = byId.get(cur);
    if (!n) break;
    const t = n.type as string;
    if (t === "speak") {
      const data = n.data as { text?: string };
      steps.push({
        id: n.id,
        kind: "speak",
        text: data.text ?? "",
      });
    } else if (t === "listen") {
      const data = n.data as {
        variableName?: string;
        timeoutSeconds?: number;
      };
      steps.push({
        id: n.id,
        kind: "listen",
        variableName: data.variableName ?? "field",
        timeoutSeconds: data.timeoutSeconds ?? 7,
      });
    } else if (t === "branch") {
      const data = n.data as { branches?: Array<{ label: string }> };
      steps.push({
        id: n.id,
        kind: "branch",
        branchLabels: (data.branches ?? []).map((b) => b.label).join(", "),
      });
    } else {
      steps.push({ id: n.id, kind: "other" });
    }
    const e = edges.find((x) => x.source === cur);
    cur = e?.target ?? null;
  }
  return steps;
}

function stepsToFlow(steps: FormStep[], previous: FlowJson): FlowJson {
  const baseY = 100;
  const nodes = steps.map((s, i) => {
    const y = baseY + i * 160;
    if (s.kind === "speak") {
      return {
        id: s.id,
        type: "speak" as const,
        position: { x: 120, y },
        data: {
          text: s.text ?? "",
          speed: 1,
          source: "tts" as const,
        },
      };
    }
    if (s.kind === "listen") {
      return {
        id: s.id,
        type: "listen" as const,
        position: { x: 120, y },
        data: {
          variableName: s.variableName ?? "field",
          timeoutSeconds: s.timeoutSeconds ?? 7,
          retryCount: 2,
          retryText: "もう一度お話しください。",
          excludeNumbers: false,
          noRetryOnFail: false,
          kanaConversion: "none" as const,
        },
      };
    }
    if (s.kind === "branch") {
      const labels = (s.branchLabels ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const branches = labels.map((label, j) => ({
        id: `b_${s.id}_${j}`,
        label,
      }));
      return {
        id: s.id,
        type: "branch" as const,
        position: { x: 120, y },
        data: {
          method: "ai" as const,
          branches: branches.length
            ? branches
            : [{ id: "b1", label: "その他" }],
          defaultNextNodeId: "",
          inputVariable: "purpose",
        },
      };
    }
    const orig = previous.nodes.find((n) => n.id === s.id);
    if (orig) {
      return {
        id: orig.id,
        type: orig.type,
        position: { x: 120, y },
        data: orig.data as Record<string, unknown>,
      };
    }
    return {
      id: s.id,
      type: "speak" as const,
      position: { x: 120, y },
      data: { text: "", speed: 1, source: "tts" as const },
    };
  });

  const edges = steps.slice(0, -1).map((s, i) => ({
    id: `fe_${i}`,
    source: s.id,
    target: steps[i + 1]!.id,
    sourceHandle: null as string | null,
  }));

  return { nodes, edges } as FlowJson;
}

export function ScenarioFormEditor({
  flowJson,
  onApply,
}: {
  flowJson: FlowJson;
  onApply: (next: FlowJson) => void;
}) {
  const initial = useMemo(() => flowToSteps(flowJson), [flowJson]);
  const [steps, setSteps] = useState<FormStep[]>(initial);

  useEffect(() => {
    setSteps(flowToSteps(flowJson));
  }, [flowJson]);

  const nonLinear = useMemo(() => {
    const n = flowJson.nodes?.length ?? 0;
    const e = flowJson.edges?.length ?? 0;
    return n > 1 && e > n - 1;
  }, [flowJson]);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-text">フォーム編集</h2>
        <Button
          type="button"
          onClick={() => onApply(stepsToFlow(steps, flowJson))}
        >
          フローに反映
        </Button>
      </div>
      {nonLinear && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          分岐が複雑なフローです。直列部分のみをフォームで編集し、分岐の詳細はフローエディタで調整してください。
        </p>
      )}
      <div className="space-y-4">
        {steps.map((s, idx) => (
          <div
            key={s.id}
            className="rounded-lg border border-border bg-white p-4 space-y-2"
          >
            <p className="text-xs font-medium text-muted">
              ステップ {idx + 1}{" "}
              <span className="text-text">
                {s.kind === "speak"
                  ? "発話"
                  : s.kind === "listen"
                    ? "ヒアリング"
                    : s.kind === "branch"
                      ? "分岐"
                      : "その他ノード"}
              </span>
            </p>
            {s.kind === "speak" && (
              <label className="block text-sm">
                <span className="text-muted text-xs">テキスト</span>
                <textarea
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                  rows={3}
                  value={s.text ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSteps((prev) =>
                      prev.map((x) => (x.id === s.id ? { ...x, text: v } : x)),
                    );
                  }}
                />
              </label>
            )}
            {s.kind === "listen" && (
              <>
                <label className="block text-sm">
                  <span className="text-muted text-xs">変数名</span>
                  <input
                    className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                    value={s.variableName ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSteps((prev) =>
                        prev.map((x) =>
                          x.id === s.id ? { ...x, variableName: v } : x,
                        ),
                      );
                    }}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted text-xs">タイムアウト（秒）</span>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                    value={s.timeoutSeconds ?? 7}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setSteps((prev) =>
                        prev.map((x) =>
                          x.id === s.id ? { ...x, timeoutSeconds: v } : x,
                        ),
                      );
                    }}
                  />
                </label>
              </>
            )}
            {s.kind === "branch" && (
              <label className="block text-sm">
                <span className="text-muted text-xs">
                  分岐ラベル（カンマ区切り）
                </span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                  value={s.branchLabels ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSteps((prev) =>
                      prev.map((x) =>
                        x.id === s.id ? { ...x, branchLabels: v } : x,
                      ),
                    );
                  }}
                />
              </label>
            )}
            {s.kind === "other" && (
              <p className="text-xs text-muted">
                このステップはフローエディタで編集してください（ID: {s.id}）
              </p>
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
          setSteps((prev) => [
            ...prev,
            { id: nid, kind: "speak", text: "新しい発話" },
          ]);
        }}
      >
        ＋ ステップを追加（発話）
      </Button>
    </div>
  );
}
