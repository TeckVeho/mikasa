"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLoadChart } from "@/components/charts/DashboardLoadChart";
import { fetchAlerts, fetchDashboardSummary } from "@/lib/load-api";

function KpiCard({ label, value, suffix = "" }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-text">
        {value}
        {suffix && <span className="ml-0.5 text-[13px] font-normal text-muted">{suffix}</span>}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const summary = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const r = await fetchDashboardSummary();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const alerts = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const r = await fetchAlerts();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="ダッシュボード"
        description="全班横断の KPI とアラート"
      />

      {summary.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
      ) : summary.data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="進行中工事" value={summary.data.activeProjectCount} suffix="件" />
          <KpiCard label="遅延リスク" value={summary.data.delayedProjectCount} suffix="件" />
          <KpiCard label="平均進捗率" value={summary.data.averageProgressRate} suffix="%" />
          <KpiCard label="今月負荷率" value={summary.data.monthlyLoadRate} suffix="%" />
        </div>
      ) : null}

      {alerts.data && alerts.data.length > 0 && (
        <div className="rounded-lg border border-border bg-white px-4 py-3">
          <h2 className="mb-2 text-[13px] font-semibold text-text">アラート</h2>
          <ul className="space-y-1.5">
            {alerts.data.map((a, i) => (
              <li
                key={i}
                className={`rounded-md px-3 py-2 text-[13px] ${
                  a.severity === "critical"
                    ? "bg-danger/5 text-danger"
                    : "bg-warning/10 text-warning"
                }`}
              >
                {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <DashboardLoadChart />
    </div>
  );
}
