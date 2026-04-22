export type AudioCaptureCallbacks = {
  onChunk: (base64Pcm16k: string) => void;
  onError: (err: Error) => void;
};

const TARGET_SAMPLE_RATE = 16_000;
const BUFFER_SIZE = 4096;

function downsample(
  input: Float32Array,
  srcRate: number,
  dstRate: number,
): Float32Array {
  if (srcRate === dstRate) return input;
  const ratio = srcRate / dstRate;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const srcIndex = i * ratio;
    const low = Math.floor(srcIndex);
    const high = Math.min(low + 1, input.length - 1);
    const frac = srcIndex - low;
    output[i] = input[low] * (1 - frac) + input[high] * frac;
  }
  return output;
}

function float32ToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class AudioCapture {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  async start(callbacks: AudioCaptureCallbacks): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      callbacks.onError(
        e instanceof Error ? e : new Error("マイクへのアクセスが拒否されました"),
      );
      return;
    }

    try {
      this.context = new AudioContext();
      this.sourceNode = this.context.createMediaStreamSource(this.stream);
      this.processorNode = this.context.createScriptProcessor(BUFFER_SIZE, 1, 1);

      const srcRate = this.context.sampleRate;

      this.processorNode.onaudioprocess = (ev: AudioProcessingEvent) => {
        const raw = ev.inputBuffer.getChannelData(0);
        const resampled = downsample(raw, srcRate, TARGET_SAMPLE_RATE);
        const pcm16 = float32ToInt16(resampled);
        callbacks.onChunk(int16ToBase64(pcm16));
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.context.destination);
    } catch (e) {
      this.stop();
      callbacks.onError(
        e instanceof Error ? e : new Error("AudioContext の初期化に失敗しました"),
      );
    }
  }

  stop(): void {
    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
