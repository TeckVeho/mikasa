"use client";

import { PageHeader } from "@/components/layout/PageHeader";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="設定" />
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          テナント情報・API連携・通知・ユーザー管理は今後のイテレーションで実装します。
        </p>
      </div>
    </div>
  );
}
