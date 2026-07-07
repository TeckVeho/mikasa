"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginWithEmailPassword } from "@/lib/auth";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-[380px] animate-fade-in-up">
        <div className="rounded-lg border border-border bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
              M
            </div>
            <h1 className="text-base font-semibold text-text">
              ミカサ金属 負荷計算システム
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              アカウント情報を入力してログイン
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5 text-[13px] text-danger"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
                className="mb-1.5 block text-[13px] font-medium text-muted-foreground"
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
                    "w-full rounded-md border border-border bg-white px-3 py-2 pr-10 text-sm text-text placeholder:text-muted/50 outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20",
                    fieldErrors.password &&
                      "border-danger focus:border-danger focus:ring-danger/20",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted transition-colors hover:text-text"
                  aria-label={
                    showPassword ? "パスワードを隠す" : "パスワードを表示"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="mt-1 text-xs text-danger">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              className="group w-full gap-1.5"
              size="md"
              loading={loading}
            >
              ログイン
              {!loading && (
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              )}
            </Button>
          </form>

          {process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true" && (
            <div className="mt-5 rounded-md border border-border bg-bg px-3 py-2 text-center">
              <p className="text-xs text-muted">
                開発モード: Firebase なしでダッシュボードへ進めます
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} ミカサ金属
        </p>
      </div>
    </div>
  );
}
