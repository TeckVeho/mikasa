export type ContactFormPayload = {
  company: string;
  name: string;
  email: string;
  phone?: string;
  callVolume?: string;
  inquiryType: string;
  message?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string): string {
  if (!value) return "";
  return `
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:10px 12px;color:#6b6459;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;color:#1a1715;white-space:pre-wrap;">${escapeHtml(value)}</td>
    </tr>`;
}

export function buildContactAdminSubject(payload: ContactFormPayload): string {
  return `[LogiVoice] ${payload.inquiryType} - ${payload.company}`;
}

export function buildContactAdminHtml(payload: ContactFormPayload): string {
  const rows = [
    row("会社名", payload.company),
    row("お名前", payload.name),
    row("メール", payload.email),
    row("電話番号", payload.phone ?? ""),
    row("月間受電件数", payload.callVolume ?? "未選択"),
    row("お問い合わせ種別", payload.inquiryType),
    row("ご相談内容", payload.message ?? "（未入力）"),
  ].join("");

  return `<!DOCTYPE html>
<html lang="ja">
<body style="margin:0;padding:24px;background:#faf9f7;font-family:'Helvetica Neue',Arial,'Hiragino Sans',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e8e5e0;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:24px 28px;background:#d97757;color:#ffffff;">
        <div style="font-size:18px;font-weight:bold;">LogiVoice お問い合わせ</div>
        <div style="margin-top:6px;font-size:13px;opacity:0.9;">LP フォームから送信されました</div>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 16px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}</table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildContactAutoReplyHtml(payload: ContactFormPayload): string {
  return `<!DOCTYPE html>
<html lang="ja">
<body style="margin:0;padding:24px;background:#faf9f7;font-family:'Helvetica Neue',Arial,'Hiragino Sans',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e8e5e0;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:24px 28px;background:#d97757;color:#ffffff;">
        <div style="font-size:18px;font-weight:bold;">LogiVoice</div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px;color:#1a1715;font-size:14px;line-height:1.7;">
        <p>${escapeHtml(payload.name)} 様</p>
        <p>この度は LogiVoice へお問い合わせいただき、ありがとうございます。</p>
        <p>以下の内容で受け付けました。担当より3営業日以内にご連絡いたします。</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #e8e5e0;border-radius:8px;font-size:13px;">
          ${row("お問い合わせ種別", payload.inquiryType)}
          ${row("会社名", payload.company)}
        </table>
        <p style="margin-top:24px;color:#6b6459;font-size:12px;">※ 本メールは自動送信です。返信いただいても確認できない場合があります。</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
