"use client";

import { listProcessTypeLegend } from "@/lib/process-colors";
import { cn } from "@/lib/utils";

export function ProcessTypeLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <span className="text-[11px] text-muted">工程:</span>
      {listProcessTypeLegend().map(({ name, colors }) => (
        <span
          key={name}
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[11px]",
            colors.cell,
            colors.label,
          )}
        >
          {name}
        </span>
      ))}
    </div>
  );
}
