import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { createHash } from "node:crypto";
import type { Result } from "@logivoice/shared";
import { getTtsCache, putTtsCache } from "./storage.js";

let client: TextToSpeechClient | null = null;

function getTtsClient(): TextToSpeechClient | null {
  if (client) return client;
  try {
    client = new TextToSpeechClient();
    return client;
  } catch {
    return null;
  }
}

function ttsCacheHash(text: string, speed: number): string {
  return createHash("sha256").update(`${text}:${speed}`).digest("hex");
}

export async function synthesizeSpeech(input: {
  text: string;
  speed: number;
}): Promise<Result<Buffer>> {
  const hash = ttsCacheHash(input.text, input.speed);
  const cached = await getTtsCache(hash);
  if (cached) {
    return { ok: true, data: cached };
  }

  const tts = getTtsClient();
  if (!tts) {
    return { ok: false, error: "TTS not configured", code: "INTERNAL_ERROR" };
  }
  const [response] = await tts.synthesizeSpeech({
    input: { text: input.text },
    voice: {
      languageCode: "ja-JP",
      name: "ja-JP-Neural2-B",
      ssmlGender: "FEMALE",
    },
    audioConfig: {
      audioEncoding: "LINEAR16",
      sampleRateHertz: 8000,
      speakingRate: input.speed,
    },
  });
  const content = response.audioContent;
  if (!content || !(content instanceof Buffer)) {
    return { ok: false, error: "no audio", code: "INTERNAL_ERROR" };
  }
  await putTtsCache(hash, content);
  return { ok: true, data: content };
}
