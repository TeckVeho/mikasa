"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, ArrowRight, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginWithEmailPassword } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true") {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
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
    await queryClient.invalidateQueries({ queryKey: ["current-user"] });
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* 左パネル: ブランドビジュアル */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between bg-gradient-to-br from-primary via-primary-hover to-[#a8503a] p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-sm font-bold backdrop-blur-sm">
              LV
            </span>
            <span className="text-lg font-semibold tracking-tight">
              LogiVoice
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <h2 className="text-3xl font-semibold leading-snug tracking-tight xl:text-4xl">
            物流の電話対応を、
            <br />
            AIでスマートに。
          </h2>
          <p className="text-base leading-relaxed text-white/80">
            受電からヒアリング、転送判断まで。
            <br />
            シナリオベースのAI音声対応で、
            <br />
            オペレーターの負荷を大幅に削減します。
          </p>

          <div className="space-y-4 pt-4">
            {[
              "ノーコードでシナリオを構築",
              "リアルタイムの文字起こしと要約",
              "通話データの分析・可視化",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Phone className="h-3 w-3" />
                </div>
                <span className="text-sm text-white/90">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} LogiVoice
        </p>
      </div>

      {/* 右パネル: ログインフォーム */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[400px] animate-fade-in-up">
          {/* モバイル用ロゴ */}
          <div className="mb-10 text-center lg:hidden">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-base font-bold text-white shadow-md">
              LV
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              ログイン
            </h1>
            <p className="mt-2 text-sm text-muted">
              アカウント情報を入力してダッシュボードにアクセス
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-3 text-sm text-danger animate-fade-in"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <Input
              label="メールアドレス"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div>
              <Input
                label="パスワード"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="mt-2 text-right">
                <button
                  type="button"
                  className="text-xs text-muted transition-colors hover:text-primary"
                >
                  パスワードをお忘れですか？
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              size="lg"
              loading={loading}
            >
              ログイン
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true" && (
            <div className="mt-8 rounded-xl border border-border bg-bg/60 px-4 py-3 text-center">
              <p className="text-xs text-muted">
                開発モード: Firebase なしでダッシュボードへ進めます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
