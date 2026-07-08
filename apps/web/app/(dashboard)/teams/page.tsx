"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthNavigator } from "@/components/team/MonthNavigator";
import { TeamSchedulePanel } from "@/components/team/TeamSchedulePanel";
import { ALL_TEAMS_TAB, TeamTabs } from "@/components/team/TeamTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchTeams } from "@/lib/load-api";
import {
  isTodayInScheduleRange,
  readStoredVisibleMonths,
  storeVisibleMonths,
  todayDateString,
  type ScheduleVisibleMonths,
} from "@/lib/schedule-display";
import { formatTeamLabel } from "@/lib/team-label";

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function todayDate(): string {
  return todayDateString();
}

function parseMonth(value: string | null): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return currentMonth();
}

export default function TeamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = todayDate();

  const monthParam = searchParams.get("month");
  const teamParam = searchParams.get("team");
  const [month, setMonth] = useState(() => parseMonth(monthParam));
  const [visibleMonths, setVisibleMonths] = useState<ScheduleVisibleMonths>(1);

  useEffect(() => {
    setVisibleMonths(readStoredVisibleMonths());
  }, []);

  function handleVisibleMonthsChange(next: ScheduleVisibleMonths) {
    setVisibleMonths(next);
    storeVisibleMonths(next);
  }

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const r = await fetchTeams();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const teams = teamsQuery.data ?? [];

  const activeTeamId = useMemo(() => {
    if (!teamParam || teamParam === ALL_TEAMS_TAB) return ALL_TEAMS_TAB;
    if (teams.some((t) => t.id === teamParam)) return teamParam;
    return ALL_TEAMS_TAB;
  }, [teamParam, teams]);

  const activeTeamName =
    activeTeamId === ALL_TEAMS_TAB
      ? "すべて"
      : formatTeamLabel(teams.find((t) => t.id === activeTeamId)?.name);

  useEffect(() => {
    setMonth(parseMonth(monthParam));
  }, [monthParam]);

  function updateUrl(nextTeamId: string, nextMonth: string) {
    const params = new URLSearchParams();
    if (nextTeamId !== ALL_TEAMS_TAB) {
      params.set("team", nextTeamId);
    }
    if (nextMonth !== currentMonth()) {
      params.set("month", nextMonth);
    }
    const qs = params.toString();
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(qs ? `/teams?${qs}${hash}` : `/teams${hash}`);
  }

  function handleTeamChange(nextTeamId: string) {
    updateUrl(nextTeamId, month);
  }

  function handleMonthChange(nextMonth: string) {
    setMonth(nextMonth);
    updateUrl(activeTeamId, nextMonth);
  }

  function scrollToToday() {
    const container = document.querySelector<HTMLElement>(".team-schedule-scroll");
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="班別ビュー"
        description="日次実績入力・班別工数管理（班シート相当）"
        action={
          <div className="flex items-center gap-3">
            <MonthNavigator
              month={month}
              months={visibleMonths}
              onChange={handleMonthChange}
            />
            {isTodayInScheduleRange(month, visibleMonths, today) && (
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={scrollToToday}
              >
                今日へ
              </button>
            )}
            <Link href="/projects" className="text-sm text-primary hover:underline">
              ← 工事一覧
            </Link>
          </div>
        }
      />

      {teamsQuery.isLoading ? (
        <Skeleton className="h-10 w-full max-w-xl" />
      ) : (
        <TeamTabs
          teams={teams}
          activeTeamId={activeTeamId}
          onChange={handleTeamChange}
        />
      )}

      <p className="text-[12px] text-muted">
        表示中: <span className="font-medium text-text">{activeTeamName}</span>
      </p>

      <TeamSchedulePanel
        teamId={activeTeamId}
        teams={teams}
        month={month}
        visibleMonths={visibleMonths}
        onVisibleMonthsChange={handleVisibleMonthsChange}
        today={today}
      />
    </div>
  );
}
