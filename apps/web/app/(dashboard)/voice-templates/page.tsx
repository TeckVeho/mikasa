"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { id: string; name: string; storagePath: string; durationMs: number | null };

export default function VoiceTemplatesPage() {
  const q = useQuery({
    queryKey: ["voice-templates"],
    queryFn: async () => {
      const r = await apiJson<Row[]>("/v1/voice-templates");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="音声テンプレート" />
      {q.isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <ul className="space-y-2">
          {(q.data ?? []).map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"
            >
              {t.name}{" "}
              <span className="text-muted text-xs">({t.storagePath})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
