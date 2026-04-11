"use client";

import type { Node } from "reactflow";

const textareaClass =
  "mt-2 w-full rounded-md border border-border bg-[#fafaf8] px-3 py-2 text-sm text-[#1a1715] placeholder:text-muted outline-none transition-shadow focus:ring-2 focus:ring-primary/30";

const inputClass =
  "mt-2 w-full rounded-md border border-border bg-[#fafaf8] px-3 py-2 text-sm text-[#1a1715] placeholder:text-muted outline-none transition-shadow focus:ring-2 focus:ring-primary/30";

export function PropertiesPanel({
  node,
  onChange,
}: {
  node: Node | null;
  onChange: (id: string, data: Record<string, unknown>) => void;
}) {
  if (!node) {
    return (
      <div className="flex w-72 shrink-0 items-start border-l border-border bg-sidebar p-5 text-sm text-muted">
        ノードをクリックして設定を表示
      </div>
    );
  }

  if (node.type === "speak") {
    const d = node.data as { text: string; speed: number };
    return (
      <div className="w-72 shrink-0 border-l border-border bg-sidebar p-5">
        <p className="text-sm font-semibold text-[#1a1715]">発話</p>
        <label className="mt-4 block text-xs font-medium text-muted">
          テキスト
        </label>
        <textarea
          className={textareaClass}
          rows={5}
          value={d.text}
          onChange={(e) => onChange(node.id, { text: e.target.value })}
          placeholder="AIが読み上げるテキストを入力..."
        />
      </div>
    );
  }

  if (node.type === "listen") {
    const d = node.data as { variableName: string };
    return (
      <div className="w-72 shrink-0 border-l border-border bg-sidebar p-5">
        <p className="text-sm font-semibold text-[#1a1715]">ヒアリング</p>
        <label className="mt-4 block text-xs font-medium text-muted">
          変数名
        </label>
        <input
          className={inputClass}
          value={d.variableName}
          onChange={(e) =>
            onChange(node.id, { variableName: e.target.value })
          }
          placeholder="例: userInput"
        />
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 border-l border-border bg-sidebar p-5 text-sm text-muted">
      このノードタイプの詳細編集は今後追加されます
    </div>
  );
}
