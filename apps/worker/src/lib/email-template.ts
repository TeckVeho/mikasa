import { getStatusDisplay, formatDuration } from "./call-status.js";

export interface CallEmailData {
  callerNumber: string;
  phoneNumber: string;
  scenarioName: string;
  status: string;
  durationSeconds: number | null;
  summaryText: string | null;
  transcriptText: string | null;
  createdAt: Date;
  transfer?: {
    department: string;
    reason: string;
    priority: string;
  } | null;
  dashboardUrl?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(date: Date): string {
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTransferSection(
  transfer: NonNullable<CallEmailData["transfer"]>,
): string {
  const priorityColor = transfer.priority === "high" ? "#dc3545" : "#333";
  const priorityLabel =
    transfer.priority === "high" ? "高" : transfer.priority === "low" ? "低" : "通常";

  return `
    <tr>
      <td style="padding:0 32px 20px;">
        <div style="font-size:14px;font-weight:bold;color:#333;margin-bottom:8px;">&#128256; 転送情報</div>
        <table width="100%" cellpadding="6" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:6px;font-size:13px;">
          <tr style="border-bottom:1px solid #f0f0f0;">
            <td style="color:#666;width:100px;">転送先</td>
            <td style="color:#333;">${escapeHtml(transfer.department)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f0f0f0;">
            <td style="color:#666;">理由</td>
            <td style="color:#333;">${escapeHtml(transfer.reason)}</td>
          </tr>
          <tr>
            <td style="color:#666;">優先度</td>
            <td style="color:${priorityColor};font-weight:bold;">${priorityLabel}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function buildSubject(data: CallEmailData): string {
  const display = getStatusDisplay(data.status, data.durationSeconds);
  return `[LogiVoice] ${display.emoji} ${data.callerNumber} → ${data.phoneNumber} (${data.scenarioName})`;
}

export function buildHtml(data: CallEmailData): string {
  const display = getStatusDisplay(data.status, data.durationSeconds);
  const duration = formatDuration(data.durationSeconds);
  const date = formatDate(data.createdAt);

  const summarySection = data.summaryText
    ? `
    <tr>
      <td style="padding:0 32px 20px;">
        <div style="font-size:14px;font-weight:bold;color:#333;margin-bottom:8px;">&#128203; AI 要約</div>
        <div style="background:#f8f9fa;border-left:3px solid #4a6cf7;padding:14px 16px;border-radius:4px;font-size:14px;line-height:1.7;color:#333;">
          ${escapeHtml(data.summaryText)}
        </div>
      </td>
    </tr>`
    : "";

  const transcriptSection = data.transcriptText
    ? `
    <tr>
      <td style="padding:0 32px 20px;">
        <div style="font-size:14px;font-weight:bold;color:#333;margin-bottom:8px;">&#128172; 会話内容</div>
        <div style="background:#fafafa;padding:14px 16px;border-radius:4px;font-size:13px;line-height:1.8;color:#555;max-height:300px;overflow:hidden;">
          ${escapeHtml(data.transcriptText).replace(/\n/g, "<br/>")}
        </div>
      </td>
    </tr>`
    : "";

  const transferSection = data.transfer
    ? buildTransferSection(data.transfer)
    : "";

  const ctaSection = data.dashboardUrl
    ? `
    <tr>
      <td align="center" style="padding:4px 32px 28px;">
        <a href="${escapeHtml(data.dashboardUrl)}" style="display:inline-block;background:#4a6cf7;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;">
          管理画面で詳細を確認
        </a>
      </td>
    </tr>`
    : "";

  const followUpBadge = display.needsFollowUp
    ? `<span style="display:inline-block;background:#fff3cd;color:#856404;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:bold;margin-left:8px;">要フォローアップ</span>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>通話記録通知</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,'Hiragino Sans',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">

          <tr>
            <td style="background:#1a1a2e;padding:20px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;">LogiVoice</span>
              <span style="color:#a0a0b0;font-size:14px;margin-left:12px;">通話記録通知</span>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:${display.color};color:#fff;padding:6px 14px;border-radius:4px;font-size:13px;font-weight:bold;">
                      ${display.emoji} ${display.label}
                    </span>
                    ${followUpBadge}
                  </td>
                  <td align="right" style="color:#888;font-size:13px;">
                    ${date}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px;">
              <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:6px;">
                <tr style="border-bottom:1px solid #f0f0f0;">
                  <td style="color:#666;font-size:13px;width:130px;">発信元番号</td>
                  <td style="font-size:15px;font-weight:bold;">${escapeHtml(data.callerNumber)}</td>
                </tr>
                <tr style="border-bottom:1px solid #f0f0f0;">
                  <td style="color:#666;font-size:13px;">着信番号</td>
                  <td style="font-size:15px;">${escapeHtml(data.phoneNumber)}</td>
                </tr>
                <tr style="border-bottom:1px solid #f0f0f0;">
                  <td style="color:#666;font-size:13px;">シナリオ</td>
                  <td style="font-size:15px;">${escapeHtml(data.scenarioName)}</td>
                </tr>
                <tr>
                  <td style="color:#666;font-size:13px;">通話時間</td>
                  <td style="font-size:15px;">${duration}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${transferSection}
          ${summarySection}
          ${transcriptSection}
          ${ctaSection}

          <tr>
            <td style="background:#f8f8f8;padding:16px 32px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                この通知は LogiVoice の通話完了通知設定に基づき自動送信されています。
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
