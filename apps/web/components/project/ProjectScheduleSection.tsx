"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProjectBlock } from "@/components/team/ProjectBlock";
import { MonthNavigator } from "@/components/team/MonthNavigator";
import { ProcessTypeLegend } from "@/components/team/ProcessTypeLegend";
import { ScheduleWidthResizer } from "@/components/team/ScheduleWidthResizer";
import { Skeleton } from "@/components/ui/skeleton";
import { useScheduleUndo } from "@/hooks/useScheduleUndo";
import type { ScheduleCellUpdate } from "@/lib/schedule-grid-clipboard";
import { buildUndoSnapshot } from "@/lib/schedule-grid-undo";
import {
  readStoredVisibleMonths,
  measureDayCellWidth,
  SCHEDULE_STICKY_COLS_WIDTH,
  storeVisibleMonths,
  type ScheduleVisibleMonths,
} from "@/lib/schedule-display";
import {
  fetchTeamSchedule,
  saveScheduleCell,
} from "@/lib/load-api";
import { formatTeamLabel } from "@/lib/team-label";

type Props = {
  projectId: string;
  teamId: string;
  teamName: string | null;
  month: string;
  onMonthChange: (month: string) => void;
  onUpdated?: () => void;
};

export function ProjectScheduleSection({
  projectId,
  teamId,
  teamName,
  month,
  onMonthChange,
  onUpdated,
}: Props) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [visibleMonths, setVisibleMonths] = useState<ScheduleVisibleMonths>(1);
  const frameRef = useRef<HTMLDivElement>(null);
  const [dayCellWidth, setDayCellWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    setVisibleMonths(readStoredVisibleMonths());
  }, []);

  const schedule = useQuery({
    queryKey: ["team-schedule", teamId, month, visibleMonths],
    queryFn: async () => {
      const r = await fetchTeamSchedule(teamId, month, visibleMonths);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const dayCount = schedule.data?.dates.length ?? 0;

  useEffect(() => {
    const el = frameRef.current;
    if (!el || dayCount === 0) return;

    const measure = () => {
      setDayCellWidth(
        measureDayCellWidth(
          el.clientWidth,
          dayCount,
          SCHEDULE_STICKY_COLS_WIDTH.normal,
        ),
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dayCount, visibleMonths]);

  function handleVisibleMonthsChange(next: ScheduleVisibleMonths) {
    setVisibleMonths(next);
    storeVisibleMonths(next);
  }

  const scheduleDataRef = useRef(schedule.data);
  scheduleDataRef.current = schedule.data;

  const applyUndo = useCallback(
    async (entry: {
      teamId: string;
      projectId: string;
      restore: ScheduleCellUpdate[];
    }) => {
      for (const update of entry.restore) {
        const r = await saveScheduleCell(entry.teamId, {
          projectId: entry.projectId,
          ...update,
        });
        if (!r.ok) {
          setMessage(r.message ?? r.error);
          return;
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["team-schedule"] });
      void queryClient.invalidateQueries({ queryKey: ["project-progress", projectId] });
      onUpdated?.();
    },
    [month, onUpdated, projectId, queryClient, teamId, visibleMonths],
  );

  const { pushUndo, isApplyingRef } = useScheduleUndo(applyUndo);

  const projectSchedule = schedule.data?.projects.find(
    (p) => p.projectId === projectId,
  );

  async function handleSaveCell(
    pid: string,
    processTypeId: string,
    date: string,
    hours: number,
  ) {
    const schedules = scheduleDataRef.current ? [scheduleDataRef.current] : [];
    const restore = buildUndoSnapshot(schedules, teamId, pid, [
      { processTypeId, date, hours: 0 },
    ]);

    const r = await saveScheduleCell(teamId, {
      projectId: pid,
      processTypeId,
      date,
      hours,
    });
    if (!r.ok) {
      setMessage(r.message ?? r.error);
      return;
    }
    if (!isApplyingRef.current) {
      pushUndo({ teamId, projectId: pid, restore });
    }
    void queryClient.invalidateQueries({ queryKey: ["team-schedule"] });
    void queryClient.invalidateQueries({ queryKey: ["project-progress", projectId] });
    onUpdated?.();
  }

  async function handleBulkSave(
    pid: string,
    updates: ScheduleCellUpdate[],
  ): Promise<boolean> {
    const schedules = scheduleDataRef.current ? [scheduleDataRef.current] : [];
    const restore = buildUndoSnapshot(schedules, teamId, pid, updates);

    for (const update of updates) {
      const r = await saveScheduleCell(teamId, {
        projectId: pid,
        ...update,
      });
      if (!r.ok) {
        setMessage(r.message ?? r.error);
        return false;
      }
    }
    if (!isApplyingRef.current) {
      pushUndo({ teamId, projectId: pid, restore });
    }
    void queryClient.invalidateQueries({ queryKey: ["team-schedule"] });
    void queryClient.invalidateQueries({ queryKey: ["project-progress", projectId] });
    onUpdated?.();
    return true;
  }

  const teamSheetHref = `/teams?team=${encodeURIComponent(teamId)}&month=${encodeURIComponent(month)}#project-${projectId}`;

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">日次スケジュール</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            {formatTeamLabel(teamName)} の班シート（この工事のみ）
          </p>
          <ProcessTypeLegend className="mt-2" />
        </div>
        <div className="flex items-center gap-3">
          <MonthNavigator
            month={month}
            months={visibleMonths}
            onChange={onMonthChange}
          />
          <Link href={teamSheetHref} className="text-[13px] text-primary hover:underline">
            全班の班シートを開く →
          </Link>
        </div>
      </div>

      {message && (
        <p className="mb-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      )}

      {schedule.isLoading ? (
        <Skeleton className="h-48" />
      ) : schedule.error ? (
        <p className="text-sm text-danger">スケジュールの取得に失敗しました</p>
      ) : !projectSchedule ? (
        <p className="text-sm text-muted">
          この月のスケジュールデータがありません。
          <Link href={teamSheetHref} className="ml-1 text-primary hover:underline">
            班シートで確認
          </Link>
        </p>
      ) : (
        <ScheduleWidthResizer
          months={visibleMonths}
          onMonthsChange={handleVisibleMonthsChange}
        >
          <div ref={frameRef}>
            <ProjectBlock
              teamId={teamId}
              project={projectSchedule}
              dates={schedule.data!.dates}
              holidays={schedule.data!.holidays}
              dayCellWidth={dayCellWidth}
              showMonthHeaders={visibleMonths > 1}
              onSaveCell={handleSaveCell}
              onBulkSave={handleBulkSave}
              anchorId={`project-${projectId}`}
            />
          </div>
        </ScheduleWidthResizer>
      )}
    </div>
  );
}
