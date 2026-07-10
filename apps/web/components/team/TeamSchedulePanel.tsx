"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeamScheduleDto } from "@logivoice/shared";
import { TeamProjectScheduleList } from "@/components/team/TeamProjectScheduleList";
import { ProcessTypeLegend } from "@/components/team/ProcessTypeLegend";
import { ScheduleWidthResizer } from "@/components/team/ScheduleWidthResizer";
import { ALL_TEAMS_TAB } from "@/components/team/TeamTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useScheduleUndo } from "@/hooks/useScheduleUndo";
import type { ScheduleCellUpdate } from "@/lib/schedule-grid-clipboard";
import {
  buildUndoSnapshot,
  type ScheduleUndoEntry,
} from "@/lib/schedule-grid-undo";
import {
  measureDayCellWidth,
  SCHEDULE_SUMMARY_STICKY_WIDTH,
  type ScheduleVisibleMonths,
} from "@/lib/schedule-display";
import {
  fetchTeamSchedule,
  saveScheduleCell,
} from "@/lib/load-api";
import { formatTeamLabel } from "@/lib/team-label";

type Team = { id: string; name: string };

type Props = {
  teamId: string;
  teams: Team[];
  month: string;
  visibleMonths: ScheduleVisibleMonths;
  onVisibleMonthsChange: (months: ScheduleVisibleMonths) => void;
  today: string;
};

function scrollToTodayColumn(container: HTMLElement | null, today: string) {
  if (!container) return;
  const target = container.querySelector<HTMLElement>(`[data-date="${today}"]`);
  if (!target) return;
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const offset =
    targetRect.left -
    containerRect.left -
    container.clientWidth / 2 +
    targetRect.width / 2;
  container.scrollTo({ left: container.scrollLeft + offset, behavior: "smooth" });
}

function ScheduleContent({
  schedules,
  month,
  visibleMonths,
  onVisibleMonthsChange,
  today,
  showTeamHeaders,
}: {
  schedules: TeamScheduleDto[];
  month: string;
  visibleMonths: ScheduleVisibleMonths;
  onVisibleMonthsChange: (months: ScheduleVisibleMonths) => void;
  today: string;
  showTeamHeaders: boolean;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const scheduleScrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [dayCellWidth, setDayCellWidth] = useState<number | undefined>(undefined);
  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;

  const applyUndo = useCallback(
    async (entry: ScheduleUndoEntry) => {
      for (const update of entry.restore) {
        const r = await saveScheduleCell(entry.teamId, {
          projectId: entry.projectId,
          processTypeId: update.processTypeId,
          date: update.date,
          hours: update.hours,
          recordType: update.recordType ?? "actual",
        });
        if (!r.ok) {
          setMessage(r.message ?? r.error);
          return;
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["team-schedule"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    [queryClient],
  );

  const { pushUndo, undo, isApplyingRef } = useScheduleUndo(applyUndo);

  const hasProjects = schedules.some((s) => s.projects.length > 0);
  const dates = schedules[0]?.dates ?? [];
  const dayCount = dates.length;
  const showMonthHeaders = visibleMonths > 1;
  let firstListAssigned = false;

  useEffect(() => {
    const el = frameRef.current;
    if (!el || dayCount === 0) return;

    const measure = () => {
      setDayCellWidth(
        measureDayCellWidth(
          el.clientWidth,
          dayCount,
          SCHEDULE_SUMMARY_STICKY_WIDTH,
        ),
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dayCount, visibleMonths]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.startsWith("#project-")) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    const todayInRange = dates.includes(today);
    if (todayInRange) {
      const timer = window.setTimeout(() => {
        scrollToTodayColumn(scheduleScrollRef.current, today);
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [schedules, month, visibleMonths, today, dates]);

  async function handleSaveCell(
    scheduleTeamId: string,
    projectId: string,
    processTypeId: string,
    date: string,
    hours: number,
    recordType: "planned" | "actual" = "actual",
  ) {
    const restore =
      !isApplyingRef.current
        ? buildUndoSnapshot(schedulesRef.current, scheduleTeamId, projectId, [
            { processTypeId, date, hours, recordType },
          ])
        : [];

    const r = await saveScheduleCell(scheduleTeamId, {
      projectId,
      processTypeId,
      date,
      hours,
      recordType,
    });
    if (!r.ok) {
      setMessage(r.message ?? r.error);
      return;
    }
    if (restore.length > 0) {
      pushUndo({ teamId: scheduleTeamId, projectId, restore });
    }
    void queryClient.invalidateQueries({ queryKey: ["team-schedule"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  async function handleBulkSave(
    scheduleTeamId: string,
    projectId: string,
    updates: ScheduleCellUpdate[],
  ): Promise<boolean> {
    const restore =
      !isApplyingRef.current
        ? buildUndoSnapshot(schedulesRef.current, scheduleTeamId, projectId, updates)
        : [];

    for (const update of updates) {
      const r = await saveScheduleCell(scheduleTeamId, {
        projectId,
        ...update,
        recordType: update.recordType ?? "actual",
      });
      if (!r.ok) {
        setMessage(r.message ?? r.error);
        return false;
      }
    }
    if (restore.length > 0) {
      pushUndo({ teamId: scheduleTeamId, projectId, restore });
    }
    void queryClient.invalidateQueries({ queryKey: ["team-schedule"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    return true;
  }

  if (!hasProjects) {
    return <p className="text-sm text-muted">担当工事がありません</p>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <span>
            表示: {visibleMonths}ヶ月（{dayCount}日）
          </span>
          <span>表の左右端をドラッグして表示幅を変更</span>
        </div>
        <ProcessTypeLegend />
      </div>

      <ScheduleWidthResizer
        months={visibleMonths}
        onMonthsChange={onVisibleMonthsChange}
      >
        <div ref={frameRef} className="space-y-6">
          {schedules.map((schedule, scheduleIndex) => {
            if (schedule.projects.length === 0) return null;

            const assignScroll = !firstListAssigned;
            if (assignScroll) firstListAssigned = true;

            return (
              <div key={schedule.teamId} className="space-y-2">
                {showTeamHeaders && (
                  <h2 className="text-sm font-semibold text-text">
                    {formatTeamLabel(schedule.teamName)}
                  </h2>
                )}
                <TeamProjectScheduleList
                  schedules={[schedule]}
                  dates={schedule.dates}
                  holidays={schedule.holidays}
                  today={today}
                  dayCellWidth={dayCellWidth}
                  showMonthHeaders={showMonthHeaders}
                  scrollRef={assignScroll ? scheduleScrollRef : undefined}
                  onSaveCell={handleSaveCell}
                  onBulkSave={handleBulkSave}
                  onUndo={() => void undo()}
                  showControls={scheduleIndex === 0}
                />
              </div>
            );
          })}
        </div>
      </ScheduleWidthResizer>
    </div>
  );
}

export function TeamSchedulePanel({
  teamId,
  teams,
  month,
  visibleMonths,
  onVisibleMonthsChange,
  today,
}: Props) {
  const isAllTeams = teamId === ALL_TEAMS_TAB;

  const singleSchedule = useQuery({
    queryKey: ["team-schedule", teamId, month, visibleMonths],
    queryFn: async () => {
      const r = await fetchTeamSchedule(teamId, month, visibleMonths);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    enabled: !isAllTeams && !!teamId,
  });

  const allScheduleQueries = useQueries({
    queries: isAllTeams
      ? teams.map((team) => ({
          queryKey: ["team-schedule", team.id, month, visibleMonths] as const,
          queryFn: async () => {
            const r = await fetchTeamSchedule(team.id, month, visibleMonths);
            if (!r.ok) throw new Error(r.message ?? r.error);
            return r.data;
          },
        }))
      : [],
  });

  if (isAllTeams) {
    const isLoading = allScheduleQueries.some((q) => q.isLoading);
    const isError = allScheduleQueries.some((q) => q.isError);
    if (isLoading) return <Skeleton className="h-64" />;
    if (isError) {
      return <p className="text-sm text-danger">班シートの読み込みに失敗しました</p>;
    }

    const schedules = allScheduleQueries
      .map((q) => q.data)
      .filter((d): d is TeamScheduleDto => !!d);

    return (
      <ScheduleContent
        schedules={schedules}
        month={month}
        visibleMonths={visibleMonths}
        onVisibleMonthsChange={onVisibleMonthsChange}
        today={today}
        showTeamHeaders
      />
    );
  }

  if (singleSchedule.isLoading) return <Skeleton className="h-64" />;
  if (singleSchedule.error || !singleSchedule.data) {
    return <p className="text-sm text-danger">班が見つかりません</p>;
  }

  return (
    <ScheduleContent
      schedules={[singleSchedule.data]}
      month={month}
      visibleMonths={visibleMonths}
      onVisibleMonthsChange={onVisibleMonthsChange}
      today={today}
      showTeamHeaders={false}
    />
  );
}
