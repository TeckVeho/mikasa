import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { newId } from "../utils/id.js";

/**
 * register_callback ツールが発火しなかった場合の検知・自動補完登録。
 */

export type ExtractedCallbackInfo = {
  reason?: string;
  callerName?: string;
  companyName?: string;
  callbackNumber?: string;
  vehicleNumber?: string;
  preferredDates?: string[];
  collectedInfo?: Record<string, unknown>;
};

const CALLBACK_CLOSING_MARKERS = [
  "おりかえしのごれんらくをうけたまわりました",
  "おりかえしごれんらくをうけたまわりました",
];

/** AI が折り返しクロージング文言を発話したか */
export function isCallbackClosingSpoken(transcript: string): boolean {
  const normalized = normalizeForMatch(transcript);
  return CALLBACK_CLOSING_MARKERS.some((marker) =>
    normalized.includes(normalizeForMatch(marker)),
  );
}

/** ツール未発火のまま折り返しクロージングが行われたか */
export function shouldCreateFallbackCallback(input: {
  transcript: string;
  wasRegistered: boolean;
}): boolean {
  if (input.wasRegistered) return false;
  return isCallbackClosingSpoken(input.transcript);
}

function normalizeForMatch(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

function getLines(transcript: string): string[] {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getSpeakerLines(transcript: string, speaker: "AI" | "user"): string[] {
  const prefix = speaker === "user" ? "お客様:" : "AI:";
  return getLines(transcript)
    .filter((line) => line.startsWith(prefix))
    .map((line) => line.slice(prefix.length).trim());
}

/** トランスクリプトから折り返し情報を簡易抽出 */
export function extractCallbackInfoFromTranscript(
  transcript: string,
): ExtractedCallbackInfo {
  const userLines = getSpeakerLines(transcript, "user");
  const aiLines = getSpeakerLines(transcript, "AI");
  const allUserText = userLines.join(" ");

  const info: ExtractedCallbackInfo = {};

  if (/しゃけん|車検/.test(allUserText + aiLines.join(" "))) {
    info.reason = "車検・日程確認";
  } else if (/てんけん|点検/.test(allUserText + aiLines.join(" "))) {
    info.reason = "点検・日程確認";
  } else if (/しゅうり|修理|こしょう|故障/.test(allUserText + aiLines.join(" "))) {
    info.reason = "修理依頼";
  } else if (/せいきゅう|請求/.test(allUserText + aiLines.join(" "))) {
    info.reason = "請求書関連";
  } else if (/レッカー|入庫|にゅうこ/.test(allUserText + aiLines.join(" "))) {
    info.reason = "入庫・レッカー連絡";
  }

  const phoneMatch = allUserText.match(/0\d[\d\s、\-]{8,14}\d/);
  if (phoneMatch) {
    info.callbackNumber = phoneMatch[0].replace(/\D/g, "");
  }

  const vehicleMatch = allUserText.match(/\b(\d{4})\b/);
  if (vehicleMatch) {
    info.vehicleNumber = vehicleMatch[1];
  }

  const dateMatches = allUserText.match(/\d{1,2}月の?\d{1,2}日/g);
  if (dateMatches && dateMatches.length > 0) {
    info.preferredDates = [...new Set(dateMatches)];
  }

  for (const aiLine of aiLines) {
    const companyMatch = aiLine.match(/(.+?)さまですね/);
    if (companyMatch && !info.companyName && aiLine.includes("かいしゃ")) {
      info.companyName = companyMatch[1].trim();
    }
  }

  const nameCandidate = [...userLines]
    .reverse()
    .find(
      (line) =>
        line.length >= 2 &&
        line.length <= 15 &&
        !/\d/.test(line) &&
        !/^(はい|ええ|大丈夫|お願い|それ|確認|車検|日程)/.test(line),
    );
  if (nameCandidate) {
    info.callerName = nameCandidate.replace(/です$|さん$|様$/, "").trim();
  }

  const collected: Record<string, unknown> = {};
  if (info.vehicleNumber) collected.vehicle_number = info.vehicleNumber;
  if (info.preferredDates) collected.preferred_dates = info.preferredDates;
  if (info.companyName) collected.company_name = info.companyName;
  if (Object.keys(collected).length > 0) {
    info.collectedInfo = collected;
  }

  return info;
}

export function buildFallbackCallbackNote(
  transcript: string,
  extracted: ExtractedCallbackInfo,
): string {
  const lines = [
    "※ register_callback ツールが発火しなかったため、通話終了時に自動補完登録しました",
  ];

  if (extracted.reason) lines.push(`用件: ${extracted.reason}`);
  if (extracted.callerName) lines.push(`お名前: ${extracted.callerName}`);
  if (extracted.companyName) lines.push(`会社名: ${extracted.companyName}`);
  if (extracted.callbackNumber) {
    lines.push(`折り返し先: ${extracted.callbackNumber}`);
  }
  if (extracted.preferredDates?.length) {
    lines.push(`希望日候補: ${extracted.preferredDates.join("、")}`);
  }
  if (extracted.collectedInfo) {
    lines.push(
      `その他: ${JSON.stringify(extracted.collectedInfo, null, 0)}`,
    );
  }

  const aiClosing = getSpeakerLines(transcript, "AI").slice(-3).join(" / ");
  if (aiClosing) {
    lines.push(`AIクロージング抜粋: ${aiClosing}`);
  }

  return lines.join("\n");
}

export type FallbackCallbackInput = {
  tenantId: string;
  callSid: string;
  callerNumber: string;
  transcript: string;
  wasRegistered: boolean;
  callLogId?: string;
};

/** ツール未発火時に折り返しリクエストを自動補完登録する */
export async function maybeCreateFallbackCallbackRequest(
  input: FallbackCallbackInput,
): Promise<boolean> {
  if (!shouldCreateFallbackCallback(input)) {
    return false;
  }

  const extracted = extractCallbackInfoFromTranscript(input.transcript);
  const callbackNumber =
    extracted.callbackNumber?.trim() || input.callerNumber.trim() || "unknown";
  const note = buildFallbackCallbackNote(input.transcript, extracted);

  await prisma.callbackRequest.create({
    data: {
      id: newId(),
      tenantId: input.tenantId,
      callLogId: input.callLogId,
      callerNumber: callbackNumber,
      preferredTime:
        extracted.preferredDates?.join("、") || undefined,
      status: "pending",
      note,
    },
  });

  logger.warn(
    {
      tenantId: input.tenantId,
      callSid: input.callSid,
      callLogId: input.callLogId,
      reason: extracted.reason,
    },
    "register_callback fallback: auto-created callback request",
  );

  return true;
}
