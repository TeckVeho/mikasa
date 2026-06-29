import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { LP_INQUIRY_TYPES } from "@/components/lp/content";
import {
  buildContactAdminHtml,
  buildContactAdminSubject,
  buildContactAutoReplyHtml,
  type ContactFormPayload,
} from "@/lib/contact-email";

const contactSchema = z.object({
  company: z.string().trim().min(1, "会社名を入力してください").max(200),
  name: z.string().trim().min(1, "お名前を入力してください").max(100),
  email: z.string().trim().email("有効なメールアドレスを入力してください").max(254),
  phone: z.string().trim().max(30).optional(),
  callVolume: z.string().trim().max(50).optional(),
  inquiryType: z.enum(LP_INQUIRY_TYPES),
  message: z.string().trim().max(5000).optional(),
  website: z.string().optional(),
});

function getResendConfig(): { apiKey: string; from: string; inbox: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "LogiVoice <noreply@logivoice.app>";
  const inbox = process.env.CONTACT_INBOX;
  if (!apiKey || !inbox) return null;
  return { apiKey, from, inbox };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_JSON", message: "リクエスト形式が不正です。" },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "入力内容を確認してください。";
    return NextResponse.json({ ok: false, error: "VALIDATION", message }, { status: 400 });
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const config = getResendConfig();
  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        error: "NOT_CONFIGURED",
        message: "メール送信の設定が完了していません。しばらくしてから再度お試しください。",
      },
      { status: 503 },
    );
  }

  const payload: ContactFormPayload = {
    company: parsed.data.company,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || undefined,
    callVolume: parsed.data.callVolume || undefined,
    inquiryType: parsed.data.inquiryType,
    message: parsed.data.message || undefined,
  };

  const resend = new Resend(config.apiKey);

  const adminResult = await resend.emails.send({
    from: config.from,
    to: config.inbox,
    replyTo: payload.email,
    subject: buildContactAdminSubject(payload),
    html: buildContactAdminHtml(payload),
  });

  if (adminResult.error) {
    console.error("contact admin email failed", adminResult.error);
    return NextResponse.json(
      {
        ok: false,
        error: "SEND_FAILED",
        message: "送信に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 502 },
    );
  }

  const autoReplyResult = await resend.emails.send({
    from: config.from,
    to: payload.email,
    subject: "【LogiVoice】お問い合わせを受け付けました",
    html: buildContactAutoReplyHtml(payload),
  });

  if (autoReplyResult.error) {
    console.error("contact auto-reply failed", autoReplyResult.error);
  }

  return NextResponse.json({ ok: true });
}
