"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LoadChartDto, LoadChartView } from "@logivoice/shared";
import { LoadChart } from "@/components/charts/LoadChart";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLoadChart } from "@/lib/load-api";
import {
  formatPeriodLabel,
  getInitialThreeMonthRange,
  getPreviousThreeMonthRange,
  mergeLoadCharts,
  parseDateOnly,
} from "@/lib/load-chart-utils";
import { cn } from "@/lib/utils";

const VIEWS: { id: LoadChartView; label: string }[] = [
  { id: "category", label: "全体（鍛冶/溶接）" },
  { id: "process", label: "工程別" },
  { id: "team", label: "班別" },
];

const MIN_PAST_MONTHS = 24;

export function DashboardLoadChart() {
  const [view, setView] = useState<LoadChartView>("category");
  const [rawData, setRawData] = useState<LoadChartDto | null>(null);
  const [loadedStart, setLoadedStart] = useState<string | null>(null);
  const [loadedEnd, setLoadedEnd] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canLoadPast, setCanLoadPast] = useState(true);
  const loadingPastRef = useRef(false);

  const displayData = rawData;

  const loadRange = useCallback(
    async (start: string, end: string, chartView: LoadChartView) => {
      const r = await fetchLoadChart({ start, end, view: chartView });
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    [],
  );

  const resetAndLoad = useCallback(
    async (chartView: LoadChartView) => {
      setIsInitialLoading(true);
      setError(null);
      setCanLoadPast(true);
      loadingPastRef.current = false;

      try {
        const range = getInitialThreeMonthRange();
        const data = await loadRange(range.start, range.end, chartView);
        setRawData(data);
        setLoadedStart(range.start);
        setLoadedEnd(range.end);
      } catch (e) {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
        setRawData(null);
        setLoadedStart(null);
        setLoadedEnd(null);
      } finally {
        setIsInitialLoading(false);
      }
    },
    [loadRange],
  );

  useEffect(() => {
    void resetAndLoad(view);
  }, [view, resetAndLoad]);

  const loadPast = useCallback(async () => {
    if (!loadedStart || !rawData || loadingPastRef.current || !canLoadPast) return;

    const anchor = parseDateOnly(loadedStart);
    const monthsBack =
      (new Date().getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
      (new Date().getUTCMonth() - anchor.getUTCMonth());
    if (monthsBack >= MIN_PAST_MONTHS) {
      setCanLoadPast(false);
      return;
    }

    loadingPastRef.current = true;
    setIsLoadingPast(true);

    try {
      const range = getPreviousThreeMonthRange(loadedStart);
      const chunk = await loadRange(range.start, range.end, view);
      const hasData = chunk.series.some((s) => s.values.some((v) => v > 0));
      if (!hasData) {
        setCanLoadPast(false);
        return;
      }

      setRawData((prev) => (prev ? mergeLoadCharts(chunk, prev) : chunk));
      setLoadedStart(range.start);
    } catch (e) {
      setError(e instanceof Error ? e.message : "過去データの読み込みに失敗しました");
    } finally {
      setIsLoadingPast(false);
      loadingPastRef.current = false;
    }
  }, [canLoadPast, loadRange, loadedStart, rawData, view]);

  const handleNearStart = useCallback(() => {
    void loadPast();
  }, [loadPast]);

  const periodLabel =
    loadedStart && loadedEnd ? formatPeriodLabel(loadedStart, loadedEnd) : null;

  const subtitle = "日別予想作業時間（横スクロールで過去を表示）";

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">負荷グラフ</h2>
          <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
        </div>
        {periodLabel && (
          <span className="text-[12px] text-muted">{periodLabel}</span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {VIEWS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] transition-colors",
              view === tab.id
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted hover:bg-bg",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isInitialLoading ? (
        <Skeleton className="h-[360px]" />
      ) : error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : displayData ? (
        <>
          <LoadChart
            data={displayData}
            scrollable
            barWidth={view === "team" ? 56 : 40}
            onNearStart={canLoadPast ? handleNearStart : undefined}
          />
          {isLoadingPast && (
            <p className="mt-2 text-[11px] text-muted">過去データを読み込み中…</p>
          )}
          {!canLoadPast && (
            <p className="mt-2 text-[11px] text-muted">
              これより過去のデータはありません
            </p>
          )}
        </>
      ) : (
        <p className="text-[13px] text-muted">データがありません</p>
      )}
    </div>
  );
}
