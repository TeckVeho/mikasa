"use client";

import { useRef } from "react";
import { GripVertical } from "lucide-react";
import {
  snapMonthsFromDrag,
  type ScheduleVisibleMonths,
} from "@/lib/schedule-display";
import { cn } from "@/lib/utils";

type Props = {
  months: ScheduleVisibleMonths;
  onMonthsChange: (months: ScheduleVisibleMonths) => void;
  children: React.ReactNode;
  className?: string;
};

export function ScheduleWidthResizer({
  months,
  onMonthsChange,
  children,
  className,
}: Props) {
  const dragRef = useRef<{
    side: "left" | "right";
    startMonths: ScheduleVisibleMonths;
    startX: number;
  } | null>(null);

  function endDrag() {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  function startDrag(side: "left" | "right", e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { side, startMonths: months, startX: e.clientX };

    const handleMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = ev.clientX - drag.startX;
      const next = snapMonthsFromDrag(drag.startMonths, delta, drag.side);
      onMonthsChange(next);
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      endDrag();
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return (
    <div className={cn("flex min-w-0 items-stretch", className)}>
      <button
        type="button"
        aria-label="表示幅を変更（左）"
        title="ドラッグして表示月数を変更（1〜3ヶ月）"
        className="flex w-3 shrink-0 cursor-col-resize items-center justify-center border-y border-l border-border bg-bg text-muted hover:bg-primary/5 hover:text-primary"
        onPointerDown={(e) => startDrag("left", e)}
      >
        <GripVertical className="h-4 w-4 opacity-50" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        aria-label="表示幅を変更（右）"
        title="ドラッグして表示月数を変更（1〜3ヶ月）"
        className="flex w-3 shrink-0 cursor-col-resize items-center justify-center border-y border-r border-border bg-bg text-muted hover:bg-primary/5 hover:text-primary"
        onPointerDown={(e) => startDrag("right", e)}
      >
        <GripVertical className="h-4 w-4 opacity-50" />
      </button>
    </div>
  );
}
