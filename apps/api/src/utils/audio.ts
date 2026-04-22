import { createRequire } from "node:module";

/** CJS バンドル経由（Node の ESM が package exports と相性が悪いため） */
const require = createRequire(import.meta.url);
const { mulaw } = require("alawmulaw") as {
  mulaw: {
    decode: (samples: Uint8Array) => Int16Array;
    encode: (samples: Int16Array) => Uint8Array;
  };
};

/** Twilio Media Stream inbound: base64 mulaw 8k mono -> PCM16 Buffer */
export function mulawBase64ToPcm16Buffer(b64: string): Buffer {
  const mulawBuf = Buffer.from(b64, "base64");
  const pcm = mulaw.decode(new Uint8Array(mulawBuf));
  return Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
}

/** PCM16 8k mono -> mulaw Buffer for Twilio outbound */
export function pcm16ToMulawBuffer(pcm: Buffer): Buffer {
  const samples = new Int16Array(
    pcm.buffer,
    pcm.byteOffset,
    pcm.byteLength / 2,
  );
  return Buffer.from(mulaw.encode(samples));
}

/** Concatenate μ-law chunks (8k mono inbound) and decode to PCM16 */
export function mulawBuffersToPcm16Buffer(chunks: Buffer[]): Buffer {
  if (chunks.length === 0) return Buffer.alloc(0);
  const concat = Buffer.concat(chunks);
  const pcm = mulaw.decode(new Uint8Array(concat));
  return Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
}

/** Build a WAV file (PCM16 LE, mono) for browser playback */
export function pcm16ToWavBuffer(pcm: Buffer, sampleRate = 8000): Buffer {
  const dataSize = pcm.length;
  const headerSize = 44;
  const out = Buffer.alloc(headerSize + dataSize);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + dataSize, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(dataSize, 40);
  pcm.copy(out, 44);
  return out;
}
