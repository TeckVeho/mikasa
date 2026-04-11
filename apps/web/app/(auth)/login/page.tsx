"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginWithEmailPassword } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true") {
      router.push("/dashboard");
      setLoading(false);
      return;
    }
    const r = await loginWithEmailPassword(email, password);
    setLoading(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
            LV
          </span>
          <h1 className="mt-4 text-lg font-semibold text-[#1a1715]">
            LogiVoice にログイン
          </h1>
          <p className="mt-1 text-sm text-muted">
            アカウント情報を入力してください
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface px-8 py-7 shadow-sm">
          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger"
            >
              {error}
            </div>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="メールアドレス"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="パスワード"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
            >
              ログイン
            </Button>
          </form>
        </div>

        {process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true" ? (
          <p className="mt-4 text-center text-xs text-muted">
            開発モード: Firebase なしでダッシュボードへ進めます
          </p>
        ) : null}
      </div>
    </div>
  );
}
