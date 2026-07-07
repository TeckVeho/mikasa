"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ScheduleUndoEntry } from "@/lib/schedule-grid-undo";

export function useScheduleUndo(
  onApply: (entry: ScheduleUndoEntry) => Promise<void>,
) {
  const stackRef = useRef<ScheduleUndoEntry[]>([]);
  const isApplyingRef = useRef(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!initRef.current) {
      const base = history.state ?? {};
      if (base.scheduleUndoDepth == null) {
        history.replaceState({ ...base, scheduleUndoDepth: 0 }, "");
      }
      initRef.current = true;
    }

    function onPopState() {
      if (isApplyingRef.current) return;
      const entry = stackRef.current.pop();
      if (!entry) return;

      isApplyingRef.current = true;
      void onApply(entry).finally(() => {
        isApplyingRef.current = false;
      });
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [onApply]);

  const pushUndo = useCallback((entry: ScheduleUndoEntry) => {
    if (isApplyingRef.current) return;
    if (entry.restore.length === 0) return;

    stackRef.current.push(entry);
    const base = history.state ?? {};
    history.pushState(
      { ...base, scheduleUndoDepth: stackRef.current.length },
      "",
    );
  }, []);

  return { pushUndo, isApplyingRef };
}
