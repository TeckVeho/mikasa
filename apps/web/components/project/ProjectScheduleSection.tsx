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
import {
  readStoredVisibleMonths,
  measureDayCellWidth,
  SCHEDULE_STICKY_COLS_WIDTH,
  storeVisibleMonths,
  todayDateString,
  type ScheduleVisibleMonths,
} from "@/lib/schedule-display";
import { fetchProjectSchedule, saveProjectScheduleCell } from "@/lib/load-api";
import { formatTeamLabels } from "@/lib/team-label";
import type { ProjectTeamDto } from "@logivoice/shared";
import type { ScheduleCellUpdate } from "@/lib/schedule-grid-clipboard";
import {
  buildProjectScheduleUndoSnapshot,
  type ScheduleUndoEntry,
} from "@/lib/schedule-grid-undo";

type Props = {
  projectId: string;
  teams: ProjectTeamDto[];
  month: string;
  onMonthChange: (month: string) => void;
  onUpdated?: () => void;
};

export function ProjectScheduleSection({
  projectId,
  teams,
  month,
  onMonthChange,
  onUpdated,
}: Props) {
  const queryClient = useQueryClient();
  const today = todayDateString();
  const [message, setMessage] = useState<string | null>(null);
  const [visibleMonths, setVisibleMonths] = useState<ScheduleVisibleMonths>(1);
  const frameRef = useRef<HTMLDivElement>(null);
  const [dayCellWidth, setDayCellWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    setVisibleMonths(readStoredVisibleMonths());
  }, []);

  const schedule = useQuery({
    queryKey: ["project-schedule", projectId, month, visibleMonths],
    queryFn: async () => {
      const r = await fetchProjectSchedule(projectId, month, visibleMonths);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const scheduleDataRef = useRef(schedule.data);
  scheduleDataRef.current = schedule.data;

  const applyUndo = useCallback(
    async (entry: ScheduleUndoEntry) => {
      for (const update of entry.restore) {
        if (update.recordType === "actual") continue;
        const r = await saveProjectScheduleCell(entry.projectId, {
          processTypeId: update.processTypeId,
          date: update.date,
          hours: update.hours,
          recordType: "planned",
        });
        if (!r.ok) {
          setMessage(r.message ?? r.error);
          return;
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["project-schedule", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-progress", projectId] });
      onUpdated?.();
    },
    [onUpdated, projectId, queryClient],
  );

  const { pushUndo, undo, isApplyingRef } = useScheduleUndo(applyUndo);

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

  async function handleSaveCell(
    pid: string,
    processTypeId: string,
    date: string,
    hours: number,
    recordType?: "planned" | "actual",
  ) {
    if (recordType === "actual") return;

    const project = scheduleDataRef.current?.project;
    const restore =
      project && !isApplyingRef.current
        ? buildProjectScheduleUndoSnapshot(project, [
            { processTypeId, date, hours, recordType: "planned" },
          ])
        : [];

    const r = await saveProjectScheduleCell(pid, {
      processTypeId,
      date,
      hours,
      recordType: "planned",
    });
    if (!r.ok) {
      setMessage(r.message ?? r.error);
      return;
    }
    if (restore.length > 0) {
      pushUndo({ teamId: "", projectId: pid, restore });
    }
    void queryClient.invalidateQueries({ queryKey: ["project-schedule", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["project-progress", projectId] });
    onUpdated?.();
  }

  async function handleBulkSave(
    pid: string,
    updates: ScheduleCellUpdate[],
  ): Promise<boolean> {
    const plannedUpdates = updates.filter(
      (update) => update.recordType !== "actual",
    );
    if (plannedUpdates.length === 0) return true;

    const project = scheduleDataRef.current?.project;
    const restore =
      project && !isApplyingRef.current
        ? buildProjectScheduleUndoSnapshot(project, plannedUpdates)
        : [];

    for (const update of plannedUpdates) {
      const r = await saveProjectScheduleCell(pid, {
        processTypeId: update.processTypeId,
        date: update.date,
        hours: update.hours,
        recordType: "planned",
      });
      if (!r.ok) {
        setMessage(r.message ?? r.error);
        return false;
      }
    }
    if (restore.length > 0) {
      pushUndo({ teamId: "", projectId: pid, restore });
    }
    void queryClient.invalidateQueries({ queryKey: ["project-schedule", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["project-progress", projectId] });
    onUpdated?.();
    return true;
  }

  const teamsHref =
    teams.length > 0
      ? `/teams?month=${encodeURIComponent(month)}#project-${projectId}`
      : "/teams";

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">日次スケジュール</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            予定は工事共通・実績は全班合算（{formatTeamLabels(teams, "班未割当")}）
          </p>
          <p className="mt-1 text-[12px] text-muted">
            実績の入力は班シートで行います
          </p>
          <ProcessTypeLegend className="mt-2" />
        </div>
        <div className="flex items-center gap-3">
          <MonthNavigator
            month={month}
            months={visibleMonths}
            onChange={onMonthChange}
          />
          {teams.length > 0 ? (
            <Link href={teamsHref} className="text-[13px] text-primary hover:underline">
              班シートで実績入力 →
            </Link>
          ) : null}
        </div>
      </div>

      {message ? (
        <p className="mb-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      ) : null}

      {schedule.isLoading ? (
        <Skeleton className="h-48" />
      ) : schedule.error ? (
        <p className="text-sm text-danger">スケジュールの取得に失敗しました</p>
      ) : !schedule.data ? (
        <p className="text-sm text-muted">スケジュールデータがありません</p>
      ) : (
        <ScheduleWidthResizer
          months={visibleMonths}
          onMonthsChange={handleVisibleMonthsChange}
        >
          <div ref={frameRef}>
            <ProjectBlock
              teamId=""
              project={schedule.data.project}
              dates={schedule.data.dates}
              holidays={schedule.data.holidays}
              today={today}
              dayCellWidth={dayCellWidth}
              showMonthHeaders={visibleMonths > 1}
              onSaveCell={handleSaveCell}
              onBulkSave={handleBulkSave}
              onUndo={() => void undo()}
              actualReadOnly
              anchorId={`project-${projectId}`}
            />
          </div>
        </ScheduleWidthResizer>
      )}
    </div>
  );
}
