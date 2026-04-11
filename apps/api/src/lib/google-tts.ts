import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { createHash } from "node:crypto";
import type { Result } from "@logivoice/shared";
import { getRedis } from "./redis.js";

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

export async function synthesizeSpeech(input: {
  text: string;
  speed: number;
}): Promise<Result<Buffer>> {
  const cacheKey = `tts:${createHash("sha256")
    .update(`${input.text}:${input.speed}`)
    .digest("hex")}`;
  const redis = getRedis();
  if (redis) {
    const cachedB64 = await redis.get(cacheKey);
    if (cachedB64) {
      return { ok: true, data: Buffer.from(cachedB64, "base64") };
    }
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
  if (redis) {
    await redis.set(cacheKey, content.toString("base64"), "EX", 86400);
  }
  return { ok: true, data: content };
}
