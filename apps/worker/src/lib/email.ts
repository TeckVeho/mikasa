import { Resend } from "resend";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
}

const DEFAULT_FROM =
  process.env.RESEND_FROM_EMAIL ?? "LogiVoice <noreply@logivoice.app>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const client = getClient();
  if (!client) {
    logger.warn("RESEND_API_KEY not set; skipping email");
    return false;
  }

  try {
    const { error } = await client.emails.send({
      from: DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      logger.error({ error }, "failed to send email");
      return false;
    }

    logger.info({ to: params.to }, "notification email sent");
    return true;
  } catch (e) {
    logger.error({ err: e }, "email send threw");
    return false;
  }
}
