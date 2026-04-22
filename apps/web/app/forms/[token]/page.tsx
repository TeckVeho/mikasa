"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function jsonToStringRecord(
  raw: unknown,
): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string") out[k] = v;
    else if (v != null) out[k] = JSON.stringify(v);
  }
  return out;
}

export default function PublicFormPage() {
  const params = useParams();
  const token = params.token as string;
  const [patch, setPatch] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ["form", token],
    queryFn: async () => {
      const res = await fetch(`${base}/v1/forms/${token}`, { cache: "no-store" });
      const body = (await res.json()) as {
        ok: boolean;
        data?: {
          structuredData?: unknown;
        };
      };
      if (!body.ok || !body.data) throw new Error("not found");
      return body.data;
    },
  });

  const baseData = useMemo(
    () => jsonToStringRecord(q.data?.structuredData),
    [q.data?.structuredData],
  );

  const merged = useMemo(() => ({ ...baseData, ...patch }), [baseData, patch]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${base}/v1/forms/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structuredData: merged }),
      });
      if (!res.ok) throw new Error("save failed");
    },
  });

  if (q.isLoading) return <p className="p-8 text-sm">読み込み中...</p>;
  if (q.isError) return <p className="p-8 text-sm">フォームが見つかりません</p>;

  const keys = Object.keys(merged);

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-text">内容の確認</h1>
        <p className="mt-2 text-sm text-muted">
          通話で伺った内容を修正して送信できます。
        </p>
        <div className="mt-4 space-y-3">
          {keys.length === 0 ? (
            <p className="text-sm text-muted">登録済みの項目がありません。</p>
          ) : (
            keys.map((k) => (
              <label key={k} className="block text-sm">
                <span className="text-muted">{k}</span>
                <input
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                  value={merged[k] ?? ""}
                  onChange={(e) =>
                    setPatch((p) => ({ ...p, [k]: e.target.value }))
                  }
                />
              </label>
            ))
          )}
        </div>
        <Button
          className="mt-6"
          onClick={() => save.mutate()}
          loading={save.isPending}
        >
          送信
        </Button>
      </div>
    </div>
  );
}
