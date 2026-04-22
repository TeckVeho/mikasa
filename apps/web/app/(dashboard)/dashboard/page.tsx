"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Phone, CheckCircle, Clock, PhoneForwarded } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

// ─── 型定義 ───────────────────────────────────────────────

type Summary = {
  totalCalls: number;
  completionRate: number;
  avgDuration: number;
  transferCount: number;
  prevPeriodComparison?: {
    totalCalls: number;
    completionRate: number;
  };
};

type DailyCalls = Array<{ date: string; count: number }>;

type HourlyDist = Array<{ hour: number; count: number }>;

type PeriodTab = "today" | "week" | "month" | "custom";

const PERIOD_LABELS: Record<PeriodTab, string> = {
  today: "今日",
  week: "今週",
  month: "今月",
  custom: "カスタム",
};

// ─── ユーティリティ ───────────────────────────────────────

function buildPeriodQuery(
  tab: PeriodTab,
  from: string,
  to: string,
): string {
  if (tab === "custom" && from && to) {
    return `period=custom&from=${from}&to=${to}`;
  }
  const map: Record<PeriodTab, string> = {
    today: "today",
    week: "week",
    month: "month",
    custom: "month",
  };
  return `period=${map[tab]}`;
}

// ─── サブコンポーネント ───────────────────────────────────

function PeriodFilter({
  tab,
  from,
  to,
  onTabChange,
  onFromChange,
  onToChange,
}: {
  tab: PeriodTab;
  from: string;
  to: string;
  onTabChange: (t: PeriodTab) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-border bg-bg p-0.5">
        {(Object.keys(PERIOD_LABELS) as PeriodTab[]).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {PERIOD_LABELS[t]}
          </button>
        ))}
      </div>
      {tab === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-sm text-muted">〜</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="text-xs text-muted">±0%</span>;
  }
  const pct = Math.round(Math.abs(delta) * 100);
  if (delta > 0) {
    return (
      <span className="text-xs font-medium text-success">
        ↑ {pct}%
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-danger">
      ↓ {pct}%
    </span>
  );
}

function KpiCard({
  title,
  value,
  delta,
  icon: Icon,
}: {
  title: string;
  value: string;
  delta?: number;
  icon?: typeof Phone;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted">{title}</p>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold text-text">{value}</p>
      {delta !== undefined && (
        <div className="mt-1.5">
          <DeltaBadge delta={delta} />
          <span className="ml-1 text-xs text-muted">先月比</span>
        </div>
      )}
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-1.5 h-3 w-16" />
    </div>
  );
}

// ─── メインページ ─────────────────────────────────────────

export default function DashboardPage() {
  const [tab, setTab] = useState<PeriodTab>("month");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const periodQuery = buildPeriodQuery(tab, from, to);
  const isCustomReady = tab !== "custom" || (from !== "" && to !== "");

  const summaryQ = useQuery({
    queryKey: ["dashboard", "summary", periodQuery],
    queryFn: async () => {
      const r = await apiJson<Summary>(`/v1/dashboard/summary?${periodQuery}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    enabled: isCustomReady,
  });

  const dailyQ = useQuery({
    queryKey: ["dashboard", "daily-calls", periodQuery],
    queryFn: async () => {
      const r = await apiJson<DailyCalls>(
        `/v1/dashboard/daily-calls?${periodQuery}`,
      );
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    enabled: isCustomReady,
  });

  const hourlyQ = useQuery({
    queryKey: ["dashboard", "hourly-distribution", periodQuery],
    queryFn: async () => {
      const r = await apiJson<HourlyDist>(
        `/v1/dashboard/hourly-distribution?${periodQuery}`,
      );
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    enabled: isCustomReady,
  });

  const byScenarioQ = useQuery({
    queryKey: ["dashboard", "by-scenario"],
    queryFn: async () => {
      const r = await apiJson<
        Array<{ scenarioId: string; scenarioName: string; callCount: number }>
      >("/v1/dashboard/by-scenario");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const byNumberQ = useQuery({
    queryKey: ["dashboard", "by-number"],
    queryFn: async () => {
      const r = await apiJson<
        Array<{ phoneNumberId: string; number: string; callCount: number }>
      >("/v1/dashboard/by-number");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const costQ = useQuery({
    queryKey: ["dashboard", "cost-estimate"],
    queryFn: async () => {
      const r = await apiJson<{
        monthToDateCalls: number;
        totalMinutes: number;
        estimatedUsd: number;
      }>("/v1/dashboard/cost-estimate");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const summaryError =
    summaryQ.isError
      ? summaryQ.error instanceof Error
        ? summaryQ.error.message
        : "不明なエラー"
      : null;

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="ダッシュボード" description="通話状況とパフォーマンスの概要" />

      {/* 期間フィルタ */}
      <div className="mb-6">
        <PeriodFilter
          tab={tab}
          from={from}
          to={to}
          onTabChange={setTab}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryQ.isLoading || !isCustomReady ? (
          [1, 2, 3, 4].map((i) => <KpiCardSkeleton key={i} />)
        ) : summaryError || !summaryQ.data ? (
          <div className="lg:col-span-4">
            <EmptyState
              title="データを読み込めませんでした"
              description={`${summaryError ?? "不明なエラー"} — API が起動しているか確認してください。`}
            />
          </div>
        ) : (
          <>
            <KpiCard
              title="受電数"
              value={String(summaryQ.data.totalCalls)}
              delta={summaryQ.data.prevPeriodComparison?.totalCalls}
              icon={Phone}
            />
            <KpiCard
              title="自動完結率"
              value={`${Math.round(summaryQ.data.completionRate * 100)}%`}
              delta={summaryQ.data.prevPeriodComparison?.completionRate}
              icon={CheckCircle}
            />
            <KpiCard
              title="平均通話時間"
              value={`${summaryQ.data.avgDuration}秒`}
              icon={Clock}
            />
            <KpiCard
              title="有人転送件数"
              value={String(summaryQ.data.transferCount)}
              icon={PhoneForwarded}
            />
          </>
        )}
      </div>

      {/* グラフエリア */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 日別受電数グラフ */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm lg:col-span-2">
          <p className="text-base font-medium text-text">日別受電数</p>
          {dailyQ.isLoading || !isCustomReady ? (
            <Skeleton className="mt-4 h-48 w-full" />
          ) : dailyQ.isError || !dailyQ.data ? (
            <div className="mt-4">
              <EmptyState title="グラフデータを取得できませんでした" />
            </div>
          ) : dailyQ.data.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="この期間のデータがありません"
                description="別の期間を選択してみてください。"
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220} className="mt-4">
              <LineChart data={dailyQ.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E5E0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6B6459" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6B6459" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #E8E5E0",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [value, "受電数"]}
                  labelFormatter={(label: string) => {
                    const d = new Date(label);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#D97757"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#D97757" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 時間帯別受電分布グラフ */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm lg:col-span-1">
          <p className="text-base font-medium text-text">時間帯別受電分布</p>
          {hourlyQ.isLoading || !isCustomReady ? (
            <Skeleton className="mt-4 h-48 w-full" />
          ) : hourlyQ.isError || !hourlyQ.data ? (
            <div className="mt-4">
              <EmptyState title="グラフデータを取得できませんでした" />
            </div>
          ) : hourlyQ.data.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="この期間のデータがありません"
                description="別の期間を選択してみてください。"
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220} className="mt-4">
              <BarChart data={hourlyQ.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E5E0" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11, fill: "#6B6459" }}
                  tickFormatter={(v: number) => `${v}時`}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6B6459" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #E8E5E0",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [value, "件数"]}
                  labelFormatter={(label: number) => `${label}時台`}
                />
                <Bar dataKey="count" fill="#D97757" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm lg:col-span-1">
          <p className="text-base font-medium text-text">シナリオ別受電</p>
          {byScenarioQ.isLoading ? (
            <Skeleton className="mt-4 h-32" />
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-muted max-h-48 overflow-y-auto">
              {(byScenarioQ.data ?? []).map((row) => (
                <li key={row.scenarioId} className="flex justify-between gap-2">
                  <span className="truncate text-text">{row.scenarioName}</span>
                  <span className="tabular-nums">{row.callCount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm lg:col-span-1">
          <p className="text-base font-medium text-text">番号別受電</p>
          {byNumberQ.isLoading ? (
            <Skeleton className="mt-4 h-32" />
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-muted max-h-48 overflow-y-auto">
              {(byNumberQ.data ?? []).map((row) => (
                <li key={row.phoneNumberId} className="flex justify-between gap-2">
                  <span className="truncate text-text">{row.number}</span>
                  <span className="tabular-nums">{row.callCount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm lg:col-span-1">
          <p className="text-base font-medium text-text">コスト概算（当月）</p>
          {costQ.isLoading ? (
            <Skeleton className="mt-4 h-24" />
          ) : costQ.data ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">通話件数</dt>
                <dd>{costQ.data.monthToDateCalls}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">合計分数</dt>
                <dd>{costQ.data.totalMinutes} 分</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">概算 USD</dt>
                <dd className="font-medium">${costQ.data.estimatedUsd}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  );
}
