"use client";

const items: { type: string; label: string; icon: string }[] = [
  { type: "speak", label: "発話", icon: "◎" },
  { type: "listen", label: "ヒアリング", icon: "◉" },
  { type: "branch", label: "分岐", icon: "◈" },
  { type: "api_call", label: "API 呼び出し", icon: "◇" },
  { type: "sms", label: "SMS 送信", icon: "◌" },
  { type: "transfer", label: "有人転送", icon: "◐" },
  { type: "end", label: "終了", icon: "●" },
];

export function NodePalette({
  onAdd,
}: {
  onAdd: (type: string, pos?: { x: number; y: number }) => void;
}) {
  return (
    <div className="w-56 shrink-0 border-r border-border bg-sidebar p-3">
      <p className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted">
        ノード
      </p>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.type}>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#3d3530] transition-colors hover:bg-primary/5 hover:text-[#1a1715]"
              onClick={() => onAdd(i.type)}
            >
              <span className="text-xs text-muted">{i.icon}</span>
              {i.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
