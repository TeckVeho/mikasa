"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { importProjectsCsv } from "@/lib/load-api";

const SAMPLE = `projectNumber,projectName,clientName,deadline,plannedHours,category
123456,テスト橋梁,○○建設,2026-12-31,500,kyotai`;

export default function ImportProjectsPage() {
  const router = useRouter();
  const [csv, setCsv] = useState(SAMPLE);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    setLoading(true);
    setResult(null);
    const r = await importProjectsCsv(csv);
    setLoading(false);
    if (!r.ok) {
      setResult(`エラー: ${r.message ?? r.error}`);
      return;
    }
    const { created, updated, errors } = r.data;
    setResult(`作成: ${created}件 / 更新: ${updated}件${errors.length ? `\n警告: ${errors.join(", ")}` : ""}`);
    if (created + updated > 0) {
      setTimeout(() => router.push("/projects"), 1500);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="工事 CSV インポート" description="工番の一致で上書き、新規は追加" />
      <div className="rounded-lg border border-border bg-white p-5">
        <textarea
          className="h-64 w-full rounded-md border border-border p-3 font-mono text-xs"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={handleImport} disabled={loading}>
            {loading ? "インポート中..." : "インポート"}
          </Button>
        </div>
        {result && <pre className="mt-4 whitespace-pre-wrap text-sm text-muted">{result}</pre>}
      </div>
    </div>
  );
}
