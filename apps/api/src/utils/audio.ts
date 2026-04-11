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
