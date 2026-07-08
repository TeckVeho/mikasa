"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProcessTypeDto } from "@logivoice/shared";
import {
  formatSchedulePercent,
  normalizeSchedulePercent,
  sumGridColumnPercents,
  sumGridPercents,
  sumGridRowPercents,
} from "@logivoice/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { fetchProcessTypes, fetchScheduleModel, saveScheduleModel } from "@/lib/load-api";

type GridCell = {
  processTypeId: string;
  dayOffset: number;
  value: string;
};

function buildGrid(
  processTypes: ProcessTypeDto[],
  totalDays: number,
  dayPatterns: { processTypeId: string; dayOffset: number; hoursRatio: number }[],
): GridCell[][] {
  const lookup = new Map<string, number>();
  for (const row of dayPatterns) {
    lookup.set(`${row.processTypeId}:${row.dayOffset}`, row.hoursRatio);
  }

  return processTypes.map((pt) =>
    Array.from({ length: totalDays }, (_, dayOffset) => ({
      processTypeId: pt.id,
      dayOffset,
      value:
        lookup.get(`${pt.id}:${dayOffset}`) != null
          ? formatSchedulePercent(lookup.get(`${pt.id}:${dayOffset}`)!)
          : "",
    })),
  );
}

function formatPercentInput(value: string): string {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return value;
  return formatSchedulePercent(num);
}

export function ModelDayGridTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [totalDays, setTotalDays] = useState(90);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [saving, setSaving] = useState(false);

  const processTypes = useQuery({
    queryKey: ["process-types"],
    queryFn: async () => {
      const r = await fetchProcessTypes();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const scheduleModel = useQuery({
    queryKey: ["schedule-model"],
    queryFn: async () => {
      const r = await fetchScheduleModel();
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  useEffect(() => {
    if (!processTypes.data) return;
    const days = scheduleModel.data?.totalDays ?? totalDays;
    setTotalDays(days);
    setGrid(
      buildGrid(processTypes.data, days, scheduleModel.data?.dayPatterns ?? []),
    );
  }, [processTypes.data, scheduleModel.data]);

  const columnTotals = useMemo(() => {
    if (grid.length === 0) return [];
    const days = grid[0]?.length ?? 0;
    return Array.from({ length: days }, (_, colIndex) =>
      sumGridColumnPercents(grid, colIndex),
    );
  }, [grid]);

  const rowTotals = useMemo(
    () => grid.map((_, rowIndex) => sumGridRowPercents(grid, rowIndex)),
    [grid],
  );

  const grandTotal = useMemo(() => sumGridPercents(grid), [grid]);

  function formatPercentTotal(total: number): string {
    return total > 0 ? `${formatSchedulePercent(total)}%` : "—";
  }

  function handleTotalDaysChange(nextDays: number) {
    if (!processTypes.data || nextDays < 1) return;
    setTotalDays(nextDays);
    setGrid((prev) =>
      processTypes.data!.map((pt, rowIndex) =>
        Array.from({ length: nextDays }, (_, dayOffset) => {
          const existing = prev[rowIndex]?.[dayOffset];
          if (existing) return existing;
          return { processTypeId: pt.id, dayOffset, value: "" };
        }),
      ),
    );
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    setGrid((prev) =>
      prev.map((row, ri) =>
        ri === rowIndex
          ? row.map((cell, ci) => (ci === colIndex ? { ...cell, value } : cell))
          : row,
      ),
    );
  }

  function finalizeCell(rowIndex: number, colIndex: number) {
    setGrid((prev) =>
      prev.map((row, ri) =>
        ri === rowIndex
          ? row.map((cell, ci) =>
              ci === colIndex && cell.value.trim() !== ""
                ? { ...cell, value: formatPercentInput(cell.value) }
                : cell,
            )
          : row,
      ),
    );
  }

  async function handleSave() {
    if (!processTypes.data) return;
    setSaving(true);
    const dayPatterns = grid.flatMap((row) =>
      row
        .map((cell) => ({
          processTypeId: cell.processTypeId,
          dayOffset: cell.dayOffset,
          hoursRatio: normalizeSchedulePercent(Number(cell.value)),
        }))
        .filter((cell) => Number.isFinite(cell.hoursRatio) && cell.hoursRatio > 0),
    );

    const r = await saveScheduleModel({ totalDays, dayPatterns });
    setSaving(false);
    if (!r.ok) {
      showToast(r.message ?? r.error ?? "保存に失敗しました", "error");
      return;
    }
    showToast("モデルマスタを保存しました");
    void queryClient.invalidateQueries({ queryKey: ["schedule-model"] });
  }

  if (processTypes.isLoading || scheduleModel.isLoading) {
    return <Skeleton className="h-64" />;
  }

  const dayColClass = "w-[3.5rem] max-w-[3.5rem] px-0.5";
  const processColClass =
    "sticky left-0 z-10 min-w-[4.25rem] w-[4.25rem] bg-inherit px-2 py-1.5";
  const totalColClass =
    "sticky right-0 z-10 min-w-[3.5rem] w-[3.5rem] bg-inherit px-1 py-1.5 text-center";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        テナント共通の1パターンのみ。各セルは全体工数に対する割合（%）です。右端の列は各工程の合計%、表下の行は各日の列合計です。
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-[13px] text-muted">
          工期日数
          <Input
            type="number"
            min={1}
            className="mt-1 w-28"
            value={totalDays}
            onChange={(e) => handleTotalDaysChange(Number(e.target.value))}
          />
        </label>
        <Button onClick={() => void handleSave()} loading={saving} disabled={saving}>
          保存
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-max border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-bg text-muted">
              <th className={`${processColClass} bg-bg text-left`}>工程</th>
              {Array.from({ length: totalDays }, (_, day) => (
                <th
                  key={day}
                  className={`${dayColClass} py-1.5 text-center text-[10px] font-normal leading-none`}
                >
                  日{day + 1}
                </th>
              ))}
              <th
                className={`${totalColClass} bg-bg py-1.5 text-[10px] font-medium leading-none`}
              >
                合計
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rowIndex) => (
              <tr key={row[0]?.processTypeId ?? rowIndex} className="border-b border-border/50">
                <td className={`${processColClass} bg-white font-medium`}>
                  {processTypes.data?.[rowIndex]?.name}
                </td>
                {row.map((cell, colIndex) => (
                  <td key={cell.dayOffset} className={dayColClass}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full rounded border border-border px-1 py-0.5 text-center text-[11px] tabular-nums"
                      value={cell.value}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      onBlur={() => finalizeCell(rowIndex, colIndex)}
                    />
                  </td>
                ))}
                <td
                  className={`${totalColClass} bg-white text-[10px] font-medium tabular-nums text-text`}
                >
                  {formatPercentTotal(rowTotals[rowIndex] ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-bg/80">
              <td className={`${processColClass} bg-bg/80 font-medium`}>割合合計</td>
              {columnTotals.map((total, day) => (
                <td
                  key={day}
                  className={`${dayColClass} py-1.5 text-center text-[10px] font-medium tabular-nums leading-none text-text`}
                >
                  {formatPercentTotal(total)}
                </td>
              ))}
              <td
                className={`${totalColClass} bg-bg/80 text-[10px] font-semibold tabular-nums text-text`}
              >
                {formatPercentTotal(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
