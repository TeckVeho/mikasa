"use client";

import { cn } from "@/lib/utils";
import { SCHEDULE_GRID_BORDER } from "@/lib/schedule-table-size";

type Props = {
  label: string;
  className?: string;
};

/** 折りたたみサマリー行の「予定」「実績」ラベル（縦書き・狭幅） */
export function SummaryRowKindCell({ label, className }: Props) {
  return (
    <td
      className={cn(
        "w-[18px] min-w-[18px] max-w-[18px] p-0 align-middle",
        SCHEDULE_GRID_BORDER,
        className,
      )}
    >
      <span
        className="mx-auto block w-[1em] text-center text-[10px] leading-none text-muted [writing-mode:vertical-rl]"
        aria-hidden
      >
        {label}
      </span>
      <span className="sr-only">{label}</span>
    </td>
  );
}
