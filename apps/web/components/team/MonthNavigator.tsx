"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  month: string;
  months?: number;
  onChange: (month: string) => void;
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function MonthNavigator({ month, months = 1, onChange }: Props) {
  const [y, m] = month.split("-").map(Number);
  const label =
    months > 1
      ? (() => {
          const end = new Date(Date.UTC(y!, m! - 1 + months, 0));
          const endY = end.getUTCFullYear();
          const endM = end.getUTCMonth() + 1;
          if (y === endY) return `起点 ${y}年${m}月〜${endM}月`;
          return `起点 ${y}年${m}月〜${endY}年${endM}月`;
        })()
      : `${y}年${m}月`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded-md border border-border p-1 hover:bg-bg"
        aria-label="前月へ"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[120px] text-center text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-md border border-border p-1 hover:bg-bg"
        aria-label="翌月へ"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
