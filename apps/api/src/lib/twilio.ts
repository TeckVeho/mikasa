import twilio from "twilio";
import type { Result } from "@logivoice/shared";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export async function listAvailableLocalNumbers(areaCode?: string) {
  const c = getClient();
  if (!c) {
    return {
      ok: false as const,
      error: "Twilio not configured",
      code: "TWILIO_ERROR",
    };
  }
  const nums = await c.availablePhoneNumbers("JP").local.list({
    areaCode: areaCode ? Number(areaCode) : undefined,
    limit: 20,
  });
  return {
    ok: true as const,
    data: nums.map((n) => ({
      phoneNumber: n.phoneNumber,
      locality: n.locality,
    })),
  };
}

export async function purchaseNumber(phoneNumber: string) {
  const c = getClient();
  if (!c) {
    return {
      ok: false as const,
      error: "Twilio not configured",
      code: "TWILIO_ERROR",
    };
  }
  const incoming = await c.incomingPhoneNumbers.create({
    phoneNumber,
  });
  return {
    ok: true as const,
    data: { sid: incoming.sid, phoneNumber: incoming.phoneNumber },
  };
}

export async function releaseNumber(twilioNumberSid: string) {
  const c = getClient();
  if (!c) {
    return {
      ok: false as const,
      error: "Twilio not configured",
      code: "TWILIO_ERROR",
    };
  }
  await c.incomingPhoneNumbers(twilioNumberSid).remove();
  return { ok: true as const, data: true };
}

export async function createByocTrunk(
  friendlyName: string,
  voiceUrl: string,
): Promise<Result<{ byocTrunkSid: string }>> {
  const c = getClient();
  if (!c) {
    return {
      ok: false as const,
      error: "Twilio not configured",
      code: "TWILIO_ERROR",
    };
  }
  const trunk = await c.voice.v1.byocTrunks.create({
    friendlyName,
    voiceUrl,
    voiceMethod: "POST",
    statusCallbackUrl: voiceUrl.replace(/\/voice$/, "/status"),
    statusCallbackMethod: "POST",
  });
  return { ok: true as const, data: { byocTrunkSid: trunk.sid } };
}

export async function deleteByocTrunk(byocTrunkSid: string): Promise<Result<true>> {
  const c = getClient();
  if (!c) {
    return {
      ok: false as const,
      error: "Twilio not configured",
      code: "TWILIO_ERROR",
    };
  }
  await c.voice.v1.byocTrunks(byocTrunkSid).remove();
  return { ok: true as const, data: true };
}

export async function sendSms(to: string, body: string): Promise<Result<true>> {
  const c = getClient();
  const from = process.env.TWILIO_SMS_FROM;
  if (!c || !from) {
    return { ok: false, error: "SMS not configured", code: "TWILIO_ERROR" };
  }
  await c.messages.create({ to, from, body });
  return { ok: true, data: true };
}
