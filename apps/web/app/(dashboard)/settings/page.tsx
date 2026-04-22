"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Check, X, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson } from "@/lib/api";

type Tab = "tenant" | "api" | "notifications" | "users" | "dictionary";

const TABS: { id: Tab; label: string }[] = [
  { id: "tenant", label: "テナント情報" },
  { id: "api", label: "API連携" },
  { id: "notifications", label: "通知設定" },
  { id: "users", label: "ユーザー管理" },
  { id: "dictionary", label: "音声認識辞書" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("tenant");

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="設定" />
      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-primary/5 hover:text-text"
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
        {activeTab === "dictionary" && <DictionaryTab />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 1: テナント情報                                                   */
/* ------------------------------------------------------------------ */

type VoiceEngine = "flow" | "gemini_live";

type TenantSettings = {
  companyName: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  voiceEngine?: VoiceEngine;
};

function TenantTab() {
  const qc = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>("flow");
  const [saved, setSaved] = useState(false);
  const [engineSaved, setEngineSaved] = useState(false);

  const q = useQuery({
    queryKey: ["settings", "tenant"],
    queryFn: async () => {
      const r = await apiJson<TenantSettings>("/v1/settings/tenant");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  useEffect(() => {
    if (!q.data) return;
    setCompanyName(q.data.companyName ?? "");
    setMaintenanceMode(q.data.maintenanceMode ?? false);
    setMaintenanceMessage(q.data.maintenanceMessage ?? "");
    setVoiceEngine(q.data.voiceEngine ?? "flow");
  }, [q.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await apiJson<TenantSettings>("/v1/settings/tenant", {
        method: "PATCH",
        body: JSON.stringify({
          companyName,
          maintenanceMode,
          maintenanceMessage: maintenanceMessage || null,
        }),
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

  const engineMutation = useMutation({
    mutationFn: async (engine: VoiceEngine) => {
      const r = await apiJson("/v1/settings/voice-engine", {
        method: "PUT",
        body: JSON.stringify({ voiceEngine: engine }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "tenant"] });
      setEngineSaved(true);
      setTimeout(() => setEngineSaved(false), 3000);
    },
    onError: (e) => {
      window.alert(`エラー: ${e.message}`);
    },
  });

  function handleEngineChange(engine: VoiceEngine) {
    setVoiceEngine(engine);
    engineMutation.mutate(engine);
  }

  return (
    <div className="space-y-6 max-w-2xl">
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="text-base font-semibold text-text mb-4">テナント情報</h2>
      {q.isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text mb-1 block">
              会社名
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="例: 株式会社ロジスティクス"
            />
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-text">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="rounded border-border"
              />
              メンテナンスモード（着信時に案内のみ再生して切断）
            </label>
            <div>
              <label className="text-xs text-muted">メンテナンスメッセージ</label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
                placeholder="ただいまメンテナンス中です..."
              />
            </div>
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

    {/* Voice Engine */}
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="text-base font-semibold text-text mb-2">音声エンジン</h2>
      <p className="text-sm text-muted mb-4">
        通話処理に使用するエンジンを選択してください。
      </p>
      <div className="flex rounded-lg border border-border p-0.5 bg-bg w-fit">
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            voiceEngine === "flow"
              ? "bg-white shadow-sm text-text"
              : "text-muted hover:text-text"
          }`}
          onClick={() => handleEngineChange("flow")}
          disabled={engineMutation.isPending}
        >
          フロー型（従来）
        </button>
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            voiceEngine === "gemini_live"
              ? "bg-white shadow-sm text-text"
              : "text-muted hover:text-text"
          }`}
          onClick={() => handleEngineChange("gemini_live")}
          disabled={engineMutation.isPending}
        >
          Gemini Live
        </button>
      </div>
      {engineMutation.isPending && (
        <p className="mt-2 text-xs text-muted">切り替え中...</p>
      )}
      {engineSaved && (
        <p className="mt-2 flex items-center gap-1 text-sm text-green-600">
          <Check size={14} />
          切り替えました
        </p>
      )}
    </div>
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
      <span className="text-sm font-medium text-text w-32 shrink-0">{label}</span>
      {editing[fieldKey] ? (
        <Input
          value={values[fieldKey] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [fieldKey]: e.target.value }))}
          type={visible[fieldKey] ? "text" : "password"}
          className="w-64"
          placeholder="APIキーを入力"
        />
      ) : (
        <span className="text-sm font-mono text-muted w-64">
          {value ? "••••••••••••" : "未設定"}
        </span>
      )}
      <button
        onClick={() => toggleVisible(fieldKey)}
        className="p-1 text-muted hover:text-text transition-colors"
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
          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="text-sm font-semibold text-text mb-3">AmiVoice</h3>
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
          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="text-sm font-semibold text-text mb-3">OpenAI</h3>
            <div className="space-y-2">
              <MaskedField
                fieldKey="openaiKey"
                label="APIキー"
                value={q.data?.openaiKey}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text w-32 shrink-0">
                  使用モデル
                </span>
                <span className="text-sm text-muted">gpt-4o</span>
              </div>
            </div>
          </div>

          {/* Twilio */}
          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="text-sm font-semibold text-text mb-3">Twilio</h3>
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
    <div className="rounded-xl border border-border bg-white p-6 max-w-2xl">
      <h2 className="text-base font-semibold text-text mb-4">通知設定</h2>
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
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-text">通話完了メール通知</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.transferEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, transferEmail: e.target.checked }))
              }
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm text-text">転送発生時メール通知</span>
          </label>
          <div>
            <label className="text-sm font-medium text-text mb-1 block">
              通知先メールアドレス
            </label>
            <Input
              type="email"
              value={form.notifyEmail}
              onChange={(e) => setForm((f) => ({ ...f, notifyEmail: e.target.value }))}
              placeholder="notify@example.com"
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
        <h2 className="text-base font-semibold text-text">ユーザー管理</h2>
        <Button
          size="sm"
          onClick={() => setShowInvite((v) => !v)}
        >
          <UserPlus size={14} className="mr-1.5" />
          ユーザーを招待
        </Button>
      </div>

      {showInvite && (
        <div className="rounded-xl border border-border bg-white p-4 mb-4 max-w-md">
          <h3 className="text-sm font-semibold text-text mb-3">ユーザーを招待</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-text mb-1 block">
                メールアドレス
              </label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text mb-1 block">
                権限
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "operator")}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
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
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                {["名前", "メール", "権限", "最終ログイン", "操作"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted"
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
                  className="border-b border-border last:border-0 hover:bg-primary/[0.03] transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-text">{user.name}</td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={user.role}
                      onChange={(e) =>
                        roleMutation.mutate({ id: user.id, role: e.target.value })
                      }
                      className="rounded-lg border border-border bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="admin">管理者</option>
                      <option value="operator">オペレーター</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
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

/* ------------------------------------------------------------------ */
/* Tab: 音声認識辞書                                                     */
/* ------------------------------------------------------------------ */

type DictRow = {
  id: string;
  word: string;
  reading: string;
  category: string;
};

function DictionaryTab() {
  const qc = useQueryClient();
  const [word, setWord] = useState("");
  const [reading, setReading] = useState("");
  const [category, setCategory] = useState("general");

  const q = useQuery({
    queryKey: ["dictionary"],
    queryFn: async () => {
      const r = await apiJson<DictRow[]>("/v1/dictionary");
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const r = await apiJson("/v1/dictionary", {
        method: "POST",
        body: JSON.stringify({ word, reading, category }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dictionary"] });
      setWord("");
      setReading("");
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiJson(`/v1/dictionary/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dictionary"] }),
  });

  return (
    <div className="rounded-xl border border-border bg-white p-6 max-w-2xl space-y-6">
      <h2 className="text-base font-semibold text-text">音声認識辞書</h2>
      <p className="text-sm text-muted">
        固有名詞の表記と読みを登録すると、認識精度が上がります。
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-sm">
          <span className="text-xs text-muted">表記</span>
          <Input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted">読み（カタカナ）</span>
          <Input
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted">カテゴリ</span>
          <select
            className="mt-1 block rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="general">一般</option>
            <option value="name">氏名</option>
            <option value="address">住所</option>
          </select>
        </label>
        <Button
          type="button"
          onClick={() => add.mutate()}
          disabled={!word || !reading || add.isPending}
        >
          追加
        </Button>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <ul className="divide-y divide-border border border-border rounded-xl">
          {(q.data ?? []).map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm"
            >
              <span>
                <span className="font-medium text-text">{row.word}</span>
                <span className="text-muted ml-2">{row.reading}</span>
                <Badge variant="neutral" className="ml-2 text-[10px]">
                  {row.category}
                </Badge>
              </span>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => del.mutate(row.id)}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
