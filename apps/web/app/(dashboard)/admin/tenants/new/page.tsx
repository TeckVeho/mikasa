"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminNewTenantPage() {
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [billingPlan, setBillingPlan] = useState("standard");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    resetLink: string | null;
    tenantId: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    const r = await apiJson<{
      tenantId: string;
      adminEmail: string;
      resetLink: string | null;
    }>("/v1/admin/tenants", {
      method: "POST",
      body: JSON.stringify({ name, adminEmail, billingPlan }),
    });
    setPending(false);
    if (!r.ok) {
      setErr(r.message ?? r.error);
      return;
    }
    setResult({
      tenantId: r.data.tenantId,
      resetLink: r.data.resetLink,
    });
  }

  if (result) {
    return (
      <div className="animate-fade-in-up max-w-lg">
        <PageHeader title="テナントを作成しました" />
        <div className="rounded-xl border border-border bg-white p-6 space-y-2 text-sm">
          <p>
            <span className="text-muted">テナントID</span>
            <br />
            <code className="text-xs break-all">{result.tenantId}</code>
          </p>
          {result.resetLink ? (
            <p>
              <span className="text-muted">初期パスワード設定リンク</span>
              <br />
              <a
                href={result.resetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline break-all text-xs"
              >
                {result.resetLink}
              </a>
            </p>
          ) : (
            <p className="text-muted text-xs">
              Firebase 未設定の場合はリンクは生成されません。
            </p>
          )}
          <div className="pt-4 flex gap-2">
            <Link
              href="/admin/tenants"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-border/60 px-3 text-xs font-medium text-text hover:bg-border"
            >
              一覧へ
            </Link>
            <Button
              type="button"
              onClick={() => {
                setResult(null);
                setName("");
                setAdminEmail("");
                setBillingPlan("standard");
              }}
            >
              続けて追加
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up max-w-lg">
      <PageHeader title="テナントを追加" />
      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-border bg-white p-6"
      >
        <div>
          <label className="text-sm font-medium text-text">会社名</label>
          <Input
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="株式会社〇〇"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text">初期管理者メール</label>
          <Input
            type="email"
            className="mt-1"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text">請求プラン</label>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            value={billingPlan}
            onChange={(e) => setBillingPlan(e.target.value)}
          >
            <option value="standard">standard</option>
            <option value="enterprise">enterprise</option>
          </select>
        </div>
        {err && (
          <p className="text-sm text-danger">{err}</p>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "作成中..." : "作成"}
          </Button>
          <Link
            href="/admin/tenants"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-muted-foreground hover:bg-bg"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
