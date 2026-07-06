"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginWithEmailPassword } from "@/lib/auth";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES = [
  "ノーコードでシナリオを構築",
  "リアルタイムの文字起こしと要約",
  "通話データの分析・可視化",
] as const;

function validateEmail(email: string): string | null {
  if (!email.trim()) return "メールアドレスを入力してください";
  if (!EMAIL_REGEX.test(email.trim())) {
    return "メールアドレスの形式が正しくありません";
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "パスワードを入力してください";
  if (password.length < 6) return "パスワードは6文字以上で入力してください";
  return null;
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("auth/invalid-credential") ||
    lower.includes("auth/wrong-password") ||
    lower.includes("auth/user-not-found") ||
    lower.includes("invalid_login_credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "メールアドレスまたはパスワードが正しくありません";
  }
  if (lower.includes("auth/invalid-email")) {
    return "メールアドレスの形式が正しくありません";
  }
  if (lower.includes("auth/too-many-requests")) {
    return "ログイン試行回数が多すぎます。しばらく待ってから再試行してください";
  }
  if (lower.includes("auth/network-request-failed")) {
    return "ネットワークエラーが発生しました。接続を確認してください";
  }
  if (lower.includes("auth/user-disabled")) {
    return "このアカウントは無効化されています。管理者にお問い合わせください";
  }
  if (lower.includes("firebase が設定されていません")) {
    return "認証サービスが設定されていません。管理者にお問い合わせください";
  }
  return message || "ログインに失敗しました。もう一度お試しください";
}

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    setError(null);
    clearFieldError("email");
    if (touched.email) {
      const err = validateEmail(value);
      setFieldErrors((prev) => ({ ...prev, email: err ?? undefined }));
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    setError(null);
    clearFieldError("password");
    if (touched.password) {
      const err = validatePassword(value);
      setFieldErrors((prev) => ({ ...prev, password: err ?? undefined }));
    }
  }

  function validateForm(): boolean {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setFieldErrors({
      email: emailError ?? undefined,
      password: passwordError ?? undefined,
    });
    setTouched({ email: true, password: true });
    return !emailError && !passwordError;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    if (process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true") {
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      router.push("/dashboard");
      setLoading(false);
      return;
    }
    const r = await loginWithEmailPassword(email.trim(), password);
    setLoading(false);
    if (!r.ok) {
      setError(mapAuthError(r.message));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["current-user"] });
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* 左パネル: ブランドビジュアル */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[480px] xl:w-[560px]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-hover to-[#8f3d28] animate-gradient-shift" />
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-16 right-0 h-64 w-64 rounded-full bg-[#f2c4a8]/20 blur-3xl animate-pulse-glow" />
        <div className="absolute right-12 top-1/3 h-40 w-40 rounded-full bg-white/5 blur-2xl animate-float" />

        <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-sm font-bold shadow-lg shadow-black/10 backdrop-blur-md ring-1 ring-white/30">
                LV
              </span>
              <span className="text-lg font-semibold tracking-tight">
                LogiVoice
              </span>
            </div>
          </div>

          <div className="space-y-8">
            <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm ring-1 ring-white/20">
                <Sparkles className="h-3.5 w-3.5" />
                AI音声対応プラットフォーム
              </div>
              <h2 className="text-3xl font-semibold leading-snug tracking-tight xl:text-4xl">
                物流の電話対応を、
                <br />
                <span className="bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
                  AIでスマートに。
                </span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/80">
                受電からヒアリング、転送判断まで。
                <br />
                シナリオベースのAI音声対応で、
                <br />
                オペレーターの負荷を大幅に削減します。
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {FEATURES.map((text, i) => (
                <div
                  key={text}
                  className="animate-stagger-fade-in flex items-center gap-3"
                  style={{ animationDelay: `${0.25 + i * 0.1}s` }}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25 backdrop-blur-sm">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-white/90">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p
            className="animate-fade-in text-xs text-white/40"
            style={{ animationDelay: "0.6s" }}
          >
            &copy; {new Date().getFullYear()} LogiVoice
          </p>
        </div>
      </div>

      {/* 右パネル: ログインフォーム */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/[0.06] blur-3xl" />

        <div className="relative w-full max-w-[420px] animate-fade-in-up">
          {/* モバイル用ロゴ */}
          <div className="mb-10 text-center lg:hidden">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-base font-bold text-white shadow-lg shadow-primary/25">
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

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <Input
              label="メールアドレス"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, email: true }));
                const err = validateEmail(email);
                setFieldErrors((prev) => ({
                  ...prev,
                  email: err ?? undefined,
                }));
              }}
              error={fieldErrors.email}
              aria-invalid={!!fieldErrors.email}
            />

            <div className="w-full">
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, password: true }));
                    const err = validatePassword(password);
                    setFieldErrors((prev) => ({
                      ...prev,
                      password: err ?? undefined,
                    }));
                  }}
                  aria-invalid={!!fieldErrors.password}
                  className={cn(
                    "w-full rounded-xl border border-border bg-white px-4 py-2.5 pr-11 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
                    fieldErrors.password &&
                      "border-danger focus:border-danger focus:ring-danger/20",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:text-text focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={
                    showPassword ? "パスワードを隠す" : "パスワードを表示"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="mt-1.5 text-xs text-danger">
                  {fieldErrors.password}
                </p>
              ) : null}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  className="text-xs text-muted transition-colors hover:text-primary"
                  tabIndex={-1}
                >
                  パスワードをお忘れですか？
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="group w-full gap-2 shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25"
              size="lg"
              loading={loading}
            >
              ログイン
              {!loading && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </Button>
          </form>

          {process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true" && (
            <div className="mt-8 rounded-xl border border-border bg-bg/60 px-4 py-3 text-center backdrop-blur-sm">
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
