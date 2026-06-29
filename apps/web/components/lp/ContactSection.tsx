"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LP_CALL_VOLUME_OPTIONS,
  LP_CONTACT_ASSURANCES,
  LP_INQUIRY_TYPES,
} from "./content";
import { SectionHeading } from "./SectionHeading";

type ContactFormState = {
  company: string;
  name: string;
  email: string;
  phone: string;
  callVolume: string;
  inquiryType: string;
  message: string;
  agreed: boolean;
  website: string;
};

const INITIAL_FORM: ContactFormState = {
  company: "",
  name: "",
  email: "",
  phone: "",
  callVolume: "",
  inquiryType: LP_INQUIRY_TYPES[0],
  message: "",
  agreed: false,
  website: "",
};

export function ContactSection() {
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof ContactFormState>(
    key: K,
    value: ContactFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.agreed) {
      setError("プライバシーポリシーへの同意が必要です。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.company,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          callVolume: form.callVolume || undefined,
          inquiryType: form.inquiryType,
          message: form.message || undefined,
          website: form.website,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !data.ok) {
        setError(data.message ?? "送信に失敗しました。時間をおいて再度お試しください。");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("送信に失敗しました。ネットワーク接続を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionHeading
              align="left"
              eyebrow="お問い合わせ・資料請求"
              title="まずはお気軽にご相談ください。"
              description="試験導入のご相談も承ります。フォーム送信後、担当より3営業日以内にご連絡します。"
            />

            <ul className="mt-8 space-y-3">
              {LP_CONTACT_ASSURANCES.map((text) => (
                <li key={text} className="flex items-center gap-3 text-sm text-text">
                  <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-bg/50 p-6 shadow-sm sm:p-8">
            {submitted ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-text">
                  送信を受け付けました
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                  お問い合わせありがとうございます。確認メールをお送りしました。担当より3営業日以内にご連絡いたします。
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={(event) => updateField("website", event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />

                <Input
                  label="会社名 *"
                  name="company"
                  value={form.company}
                  onChange={(event) => updateField("company", event.target.value)}
                  required
                  disabled={loading}
                />
                <Input
                  label="お名前 *"
                  name="name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                  disabled={loading}
                />
                <Input
                  label="メールアドレス *"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                  disabled={loading}
                />
                <Input
                  label="電話番号"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  disabled={loading}
                />

                <div>
                  <label
                    htmlFor="callVolume"
                    className="mb-1.5 block text-sm font-medium text-muted-foreground"
                  >
                    月間受電件数の目安
                  </label>
                  <select
                    id="callVolume"
                    name="callVolume"
                    value={form.callVolume}
                    onChange={(event) => updateField("callVolume", event.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
                  >
                    <option value="">選択してください</option>
                    {LP_CALL_VOLUME_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="inquiryType"
                    className="mb-1.5 block text-sm font-medium text-muted-foreground"
                  >
                    お問い合わせ種別 *
                  </label>
                  <select
                    id="inquiryType"
                    name="inquiryType"
                    value={form.inquiryType}
                    onChange={(event) => updateField("inquiryType", event.target.value)}
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
                  >
                    {LP_INQUIRY_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-1.5 block text-sm font-medium text-muted-foreground"
                  >
                    ご相談内容（任意）
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={form.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
                    placeholder="ご相談内容をご記入ください"
                  />
                </div>

                <label className="flex items-start gap-3 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(event) => updateField("agreed", event.target.checked)}
                    disabled={loading}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                  />
                  <span>プライバシーポリシーに同意する *</span>
                </label>

                {error ? (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={loading}
                  className="rounded-full"
                >
                  送信する
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
