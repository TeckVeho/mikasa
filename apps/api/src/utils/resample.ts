/**
 * PCM16 (little-endian Int16) resample utilities for Twilio ↔ Gemini Live bridging.
 *
 * Twilio  : μ-law 8 kHz mono  → decoded to PCM16 8 kHz
 * Gemini  : input PCM16 16 kHz / output PCM16 24 kHz
 */

/** 8 kHz PCM16 → 16 kHz PCM16 アップサンプル（線形補間） */
export function resample8kTo16k(pcm8k: Buffer): Buffer {
  const sampleCount = pcm8k.length / 2;
  if (sampleCount === 0) return Buffer.alloc(0);

  const out = Buffer.alloc(sampleCount * 2 * 2); // 2x samples, 2 bytes each
  let outIdx = 0;

  for (let i = 0; i < sampleCount; i++) {
    const cur = pcm8k.readInt16LE(i * 2);
    const next =
      i + 1 < sampleCount ? pcm8k.readInt16LE((i + 1) * 2) : cur;

    out.writeInt16LE(cur, outIdx);
    outIdx += 2;
    // interpolated midpoint
    out.writeInt16LE(Math.round((cur + next) / 2), outIdx);
    outIdx += 2;
  }

  return out;
}

/** 24 kHz PCM16 → 8 kHz PCM16 ダウンサンプル（3:1 デシメーション） */
export function resample24kTo8k(pcm24k: Buffer): Buffer {
  const sampleCount = pcm24k.length / 2;
  const outCount = Math.floor(sampleCount / 3);
  if (outCount === 0) return Buffer.alloc(0);

  const out = Buffer.alloc(outCount * 2);

  for (let i = 0; i < outCount; i++) {
    out.writeInt16LE(pcm24k.readInt16LE(i * 3 * 2), i * 2);
  }

  return out;
}
