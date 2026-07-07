"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LoadChartDto } from "@logivoice/shared";
import { cn } from "@/lib/utils";
import { formatTeamLabel } from "@/lib/team-label";

const PROCESS_COLORS = [
  "#d97757",
  "#6b8cae",
  "#8b9a6b",
  "#c4a35a",
  "#9b7bb5",
  "#5a8f8f",
];

const CATEGORY_COLORS: Record<string, string> = {
  forging: "#6b8cae",
  welding: "#d97757",
  other: "#c4a35a",
};

const SCROLL_EDGE_THRESHOLD = 80;

type Props = {
  data: LoadChartDto;
  height?: number;
  scrollable?: boolean;
  barWidth?: number;
  onNearStart?: () => void;
};

export function LoadChart({
  data,
  height = 360,
  scrollable = false,
  barWidth = 40,
  onNearStart,
}: Props) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollWidthRef = useRef(0);
  const prevDatesLengthRef = useRef(0);

  const seriesKeys = useMemo(
    () => data.series.map((s) => s.key).join(","),
    [data.series],
  );

  useEffect(() => {
    setHiddenKeys(new Set());
  }, [data.view, seriesKeys]);

  const colorByKey = useMemo(() => {
    const map = new Map<string, string>();
    data.series.forEach((s, i) => {
      map.set(
        s.key,
        CATEGORY_COLORS[s.key] ?? PROCESS_COLORS[i % PROCESS_COLORS.length]!,
      );
    });
    return map;
  }, [data.series]);

  const labelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of data.series) {
      map.set(
        s.key,
        data.view === "team" ? formatTeamLabel(s.label) : s.label,
      );
    }
    return map;
  }, [data.series, data.view]);

  const chartData = data.dates.map((date, i) => {
    const row: Record<string, string | number> = {
      date: date.includes("-") ? date.slice(5) : date,
    };
    for (const s of data.series) {
      if (!hiddenKeys.has(s.key)) {
        row[labelByKey.get(s.key)!] = s.values[i] ?? 0;
      }
    }
    return row;
  });

  const isStacked = data.view === "process" || data.view === "category";
  const visibleCount = data.series.length - hiddenKeys.size;
  const chartInnerHeight = height;
  const chartWidth = Math.max(chartData.length * barWidth + 64, 320);

  function toggleSeries(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (visibleCount > 1) {
        next.add(key);
      }
      return next;
    });
  }

  useLayoutEffect(() => {
    if (!scrollable) return;
    const el = scrollRef.current;
    if (!el) return;

    const prevLen = prevDatesLengthRef.current;
    const newLen = chartData.length;

    if (newLen > prevLen && prevLen > 0) {
      const delta = el.scrollWidth - prevScrollWidthRef.current;
      if (delta > 0) {
        el.scrollLeft += delta;
      }
    } else if (prevLen === 0 && newLen > 0) {
      el.scrollLeft = el.scrollWidth;
    }

    prevScrollWidthRef.current = el.scrollWidth;
    prevDatesLengthRef.current = newLen;
  }, [chartData.length, scrollable]);

  useEffect(() => {
    if (!scrollable || !onNearStart) return;
    const el = scrollRef.current;
    if (!el) return;

    function handleScroll() {
      if (!el || el.scrollLeft > SCROLL_EDGE_THRESHOLD) return;
      onNearStart?.();
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [onNearStart, scrollable]);

  function renderBars() {
    return (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e5e0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          interval={scrollable ? 0 : undefined}
          angle={scrollable ? -45 : 0}
          textAnchor={scrollable ? "end" : "middle"}
          height={scrollable ? 50 : 30}
        />
        <YAxis tick={{ fontSize: 11 }} width={40} />
        <Tooltip />
        {data.series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={labelByKey.get(s.key)!}
            stackId={isStacked ? "stack" : undefined}
            fill={colorByKey.get(s.key) ?? PROCESS_COLORS[i % PROCESS_COLORS.length]}
            radius={isStacked ? undefined : [2, 2, 0, 0]}
            hide={hiddenKeys.has(s.key)}
            legendType="square"
          />
        ))}
        {data.paceLines.map((pl) => (
          <ReferenceLine
            key={pl.label}
            y={pl.value}
            stroke="#6b6459"
            strokeDasharray="4 4"
          />
        ))}
      </>
    );
  }

  function renderStickyLegend() {
    return (
      <div
        className="pointer-events-auto absolute right-0 top-0 z-10 flex max-w-[min(100%,420px)] flex-wrap justify-end gap-x-3 gap-y-1 rounded-md border border-border bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
        aria-label="グラフ凡例"
      >
        {data.series.map((s) => {
          const label = labelByKey.get(s.key)!;
          const hidden = hiddenKeys.has(s.key);
          const color = colorByKey.get(s.key) ?? "#6b6459";
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSeries(s.key)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition-opacity",
                hidden
                  ? "text-muted line-through opacity-50"
                  : "text-text hover:opacity-80",
              )}
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: color }}
              />
              {label}
            </button>
          );
        })}
        {data.paceLines.map((pl) => (
          <span
            key={pl.label}
            className="flex items-center gap-1.5 text-[11px] text-muted"
          >
            <span className="inline-block w-4 shrink-0 border-t-2 border-dashed border-[#6b6459]" />
            {pl.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="mb-2 text-[11px] text-muted">
        凡例をクリックして表示する系列を切り替えられます
        {scrollable && " · 左端までスクロールすると過去データを読み込みます"}
      </p>
      <div className="relative" style={{ height }}>
        {renderStickyLegend()}
        {scrollable ? (
          <div ref={scrollRef} className="h-full overflow-x-auto">
            <BarChart
              width={chartWidth}
              height={chartInnerHeight}
              data={chartData}
              margin={{ top: 36, right: 16, left: 0, bottom: 0 }}
            >
              {renderBars()}
            </BarChart>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 36, right: 16, left: 0, bottom: 0 }}
            >
              {renderBars()}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
