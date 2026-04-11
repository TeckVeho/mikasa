"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Check, X, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson } from "@/lib/api";

type Tab = "tenant" | "api" | "notifications" | "users";

const TABS: { id: Tab; label: string }[] = [
  { id: "tenant", label: "テナント情報" },
  { id: "api", label: "API連携" },
  { id: "notifications", label: "通知設定" },
  { id: "users", label: "ユーザー管理" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("tenant");

  return (
    <div>
      <PageHeader title="設定" />
      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "text-[#6b6560] hover:bg-[#f5f0e8]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab === "tenant" && <TenantTab />}
        {activeTab === "api" && <ApiTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "users" && <UsersTab />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1: テナント情報                                                   */
/* ------------------------------------------------------------------ */

type TenantSettings = { companyName: string };

function TenantTab() {
  const qc = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [saved, setSaved] = useState(false);

  const q = useQuery({
    queryKey: ["settings", "tenant"],
    queryFn: async () => {
      const r = await apiJson<TenantSettings>("/v1/settings/tenant");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  // sync initial value once loaded
  if (q.data && companyName === "" && q.data.companyName) {
    setCompanyName(q.data.companyName);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await apiJson<TenantSettings>("/v1/settings/tenant", {
        method: "PATCH",
        body: JSON.stringify({ companyName }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "tenant"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e) => {
      window.alert(`エラー: ${e.message}`);
    },
  });

  return (
    <div className="rounded-xl border border-[#e8e5e0] bg-white p-6 max-w-lg">
      <h2 className="text-base font-semibold text-[#1a1715] mb-4">テナント情報</h2>
      {q.isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#1a1715] mb-1 block">
              会社名
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="例: 株式会社ロジスティクス"
              className="rounded-md border border-[#e8e5e0] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "保存中..." : "保存"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check size={14} />
                保存しました
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2: API連携                                                        */
/* ------------------------------------------------------------------ */

type ApiKeys = {
  amivoiceKey?: string;
  openaiKey?: string;
  twilioSid?: string;
  twilioToken?: string;
};

type ConnectionStatus = "idle" | "testing" | "success" | "error";

function ApiTab() {
  const qc = useQueryClient();
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<ApiKeys>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const q = useQuery({
    queryKey: ["settings", "api-keys"],
    queryFn: async () => {
      const r = await apiJson<ApiKeys>("/v1/settings/api-keys");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  if (q.data && Object.keys(values).length === 0) {
    setValues(q.data);
  }

  const mutation = useMutation({
    mutationFn: async (patch: Partial<ApiKeys>) => {
      const r = await apiJson<ApiKeys>("/v1/settings/api-keys", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "api-keys"] });
      setEditing({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (e) => {
      window.alert(`エラー: ${e.message}`);
    },
  });

  const testConnection = async (service: string) => {
    setConnectionStatus("testing");
    const r = await apiJson<{ success: boolean }>("/v1/settings/test-connection", {
      method: "POST",
      body: JSON.stringify({ service }),
    });
    if (r.ok && r.data.success) {
      setConnectionStatus("success");
    } else {
      setConnectionStatus("error");
    }
    setTimeout(() => setConnectionStatus("idle"), 5000);
  };

  const toggleVisible = (key: string) =>
    setVisible((v) => ({ ...v, [key]: !v[key] }));
  const toggleEditing = (key: string) =>
    setEditing((e) => ({ ...e, [key]: !e[key] }));

  const handleSave = () => {
    const patch: Partial<ApiKeys> = {};
    if (editing.amivoiceKey) patch.amivoiceKey = values.amivoiceKey;
    if (editing.openaiKey) patch.openaiKey = values.openaiKey;
    if (editing.twilioSid) patch.twilioSid = values.twilioSid;
    if (editing.twilioToken) patch.twilioToken = values.twilioToken;
    mutation.mutate(patch);
  };

  const MaskedField = ({
    fieldKey,
    label,
    value,
  }: {
    fieldKey: keyof ApiKeys;
    label: string;
    value?: string;
  }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-[#1a1715] w-32 shrink-0">{label}</span>
      {editing[fieldKey] ? (
        <Input
          value={values[fieldKey] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [fieldKey]: e.target.value }))}
          type={visible[fieldKey] ? "text" : "password"}
          className="rounded-md border border-[#e8e5e0] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 w-64"
          placeholder="APIキーを入力"
        />
      ) : (
        <span className="text-sm font-mono text-[#6b6560] w-64">
          {value ? "••••••••••••" : "未設定"}
        </span>
      )}
      <button
        onClick={() => toggleVisible(fieldKey)}
        className="p-1 text-[#6b6560] hover:text-[#1a1715]"
        title={visible[fieldKey] ? "非表示" : "表示"}
      >
        {visible[fieldKey] ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
      <button
        onClick={() => toggleEditing(fieldKey)}
        className="text-xs text-primary hover:underline"
      >
        {editing[fieldKey] ? "キャンセル" : "編集"}
      </button>
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      {q.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <>
          {/* AmiVoice */}
          <div className="rounded-xl border border-[#e8e5e0] bg-white p-6">
            <h3 className="text-sm font-semibold text-[#1a1715] mb-3">AmiVoice</h3>
            <div className="space-y-2">
              <MaskedField
                fieldKey="amivoiceKey"
                label="APIキー"
                value={q.data?.amivoiceKey}
              />
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testConnection("amivoice")}
                  disabled={connectionStatus === "testing"}
                >
                  {connectionStatus === "testing" ? "テスト中..." : "接続テスト"}
                </Button>
                {connectionStatus === "success" && (
                  <Badge variant="success">
                    <Check size={12} className="mr-1" />
                    接続成功
                  </Badge>
                )}
                {connectionStatus === "error" && (
                  <Badge variant="danger">
                    <X size={12} className="mr-1" />
                    接続失敗
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* OpenAI */}
          <div className="rounded-xl border border-[#e8e5e0] bg-white p-6">
            <h3 className="text-sm font-semibold text-[#1a1715] mb-3">OpenAI</h3>
            <div className="space-y-2">
              <MaskedField
                fieldKey="openaiKey"
                label="APIキー"
                value={q.data?.openaiKey}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#1a1715] w-32 shrink-0">
                  使用モデル
                </span>
                <span className="text-sm text-[#6b6560]">gpt-4o</span>
              </div>
            </div>
          </div>

          {/* Twilio */}
          <div className="rounded-xl border border-[#e8e5e0] bg-white p-6">
            <h3 className="text-sm font-semibold text-[#1a1715] mb-3">Twilio</h3>
            <div className="space-y-2">
              <MaskedField
                fieldKey="twilioSid"
                label="Account SID"
                value={q.data?.twilioSid}
              />
              <MaskedField
                fieldKey="twilioToken"
                label="Auth Token"
                value={q.data?.twilioToken}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={mutation.isPending || Object.values(editing).every((v) => !v)}
            >
              {mutation.isPending ? "保存中..." : "保存"}
            </Button>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check size={14} />
                保存しました
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3: 通知設定                                                        */
/* ------------------------------------------------------------------ */

type NotificationSettings = {
  callCompleteEmail: boolean;
  transferEmail: boolean;
  notifyEmail: string;
};

function NotificationsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<NotificationSettings>({
    callCompleteEmail: false,
    transferEmail: false,
    notifyEmail: "",
  });
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const q = useQuery({
    queryKey: ["settings", "notifications"],
    queryFn: async () => {
      const r = await apiJson<NotificationSettings>("/v1/settings/notifications");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  if (q.data && !initialized) {
    setForm(q.data);
    setInitialized(true);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await apiJson<NotificationSettings>("/v1/settings/notifications", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "notifications"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e) => {
      window.alert(`エラー: ${e.message}`);
    },
  });

  return (
    <div className="rounded-xl border border-[#e8e5e0] bg-white p-6 max-w-lg">
      <h2 className="text-base font-semibold text-[#1a1715] mb-4">通知設定</h2>
      {q.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}
        </div>
      ) : (
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.callCompleteEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, callCompleteEmail: e.target.checked }))
              }
              className="h-4 w-4 rounded border-[#e8e5e0] accent-primary"
            />
            <span className="text-sm text-[#1a1715]">通話完了メール通知</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.transferEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, transferEmail: e.target.checked }))
              }
              className="h-4 w-4 rounded border-[#e8e5e0] accent-primary"
            />
            <span className="text-sm text-[#1a1715]">転送発生時メール通知</span>
          </label>
          <div>
            <label className="text-sm font-medium text-[#1a1715] mb-1 block">
              通知先メールアドレス
            </label>
            <Input
              type="email"
              value={form.notifyEmail}
              onChange={(e) => setForm((f) => ({ ...f, notifyEmail: e.target.value }))}
              placeholder="notify@example.com"
              className="rounded-md border border-[#e8e5e0] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "保存中..." : "保存"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check size={14} />
                保存しました
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 4: ユーザー管理                                                   */
/* ------------------------------------------------------------------ */

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt: string | null;
};

function UsersTab() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "operator">("operator");

  const q = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const r = await apiJson<User[]>("/v1/users");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const r = await apiJson<{ id: string }>("/v1/users/invite", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setInviteEmail("");
      setShowInvite(false);
      window.alert("招待メールを送信しました");
    },
    onError: (e) => {
      window.alert(`エラー: ${e.message}`);
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const r = await apiJson<User>(`/v1/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => {
      window.alert(`エラー: ${e.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiJson<unknown>(`/v1/users/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => {
      window.alert(`エラー: ${e.message}`);
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`${name} を削除しますか？`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#1a1715]">ユーザー管理</h2>
        <Button
          size="sm"
          onClick={() => setShowInvite((v) => !v)}
        >
          <UserPlus size={14} className="mr-1.5" />
          ユーザーを招待
        </Button>
      </div>

      {showInvite && (
        <div className="rounded-xl border border-[#e8e5e0] bg-white p-4 mb-4 max-w-md">
          <h3 className="text-sm font-semibold text-[#1a1715] mb-3">ユーザーを招待</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-[#1a1715] mb-1 block">
                メールアドレス
              </label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="rounded-md border border-[#e8e5e0] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1a1715] mb-1 block">
                権限
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "operator")}
                className="rounded-md border border-[#e8e5e0] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 w-full"
              >
                <option value="operator">オペレーター</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => inviteMutation.mutate()}
                disabled={!inviteEmail || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "送信中..." : "招待を送る"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInvite(false)}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}

      {q.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e8e5e0] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e8e5e0]">
              <tr>
                {["名前", "メール", "権限", "最終ログイン", "操作"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#6b6560]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[#e8e5e0] last:border-0 hover:bg-[#f5f0e8]/60"
                >
                  <td className="px-4 py-3 font-medium text-[#1a1715]">{user.name}</td>
                  <td className="px-4 py-3 text-[#6b6560]">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={user.role}
                      onChange={(e) =>
                        roleMutation.mutate({ id: user.id, role: e.target.value })
                      }
                      className="rounded border border-[#e8e5e0] bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="admin">管理者</option>
                      <option value="operator">オペレーター</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[#6b6560] text-xs">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString("ja-JP")
                      : "未ログイン"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      disabled={deleteMutation.isPending}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
