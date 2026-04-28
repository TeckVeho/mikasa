"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Phone, PhoneOff, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioCapture } from "@/lib/audio-worklet";
import { TestCallClient } from "@/lib/test-call-ws";

type Props = {
  scenarioId: string;
  open: boolean;
  onClose: () => void;
};

type TranscriptEntry = {
  id: number;
  role: "user" | "model";
  text: string;
};

type ToolLogEntry = {
  id: number;
  type: "call" | "result";
  name: string;
  payload: unknown;
};

type CallStatus = "connecting" | "active" | "ended" | "error";

const PLAYBACK_SAMPLE_RATE = 24_000;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function base64ToFloat32(base64: string, sampleRate: number): AudioBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 0x8000;
  }
  const ctx = new OfflineAudioContext(1, float32.length, sampleRate);
  const buffer = ctx.createBuffer(1, float32.length, sampleRate);
  buffer.getChannelData(0).set(float32);
  return buffer;
}

export function TestCallDialog({ scenarioId, open, onClose }: Props) {
  const [status, setStatus] = useState<CallStatus>("connecting");
  const [elapsed, setElapsed] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [toolLogs, setToolLogs] = useState<ToolLogEntry[]>([]);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureRef = useRef<AudioCapture | null>(null);
  const clientRef = useRef<TestCallClient | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextIdRef = useRef(1);
  const nextPlayTimeRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    captureRef.current?.stop();
    captureRef.current = null;
    clientRef.current?.stop();
    clientRef.current = null;
    if (playbackCtxRef.current) {
      void playbackCtxRef.current.close();
      playbackCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    setStatus("connecting");
    setElapsed(0);
    setTranscripts([]);
    setToolLogs([]);
    setMuted(false);
    setError(null);
    nextIdRef.current = 1;
    nextPlayTimeRef.current = 0;

    const capture = new AudioCapture();
    const client = new TestCallClient();
    captureRef.current = capture;
    clientRef.current = client;
    playbackCtxRef.current = new AudioContext();

    client.connect(scenarioId, {
      onAudio: (base64) => {
        const ctx = playbackCtxRef.current;
        if (!ctx) return;
        try {
          const buffer = base64ToFloat32(base64, PLAYBACK_SAMPLE_RATE);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          const now = ctx.currentTime;
          const startAt = Math.max(now, nextPlayTimeRef.current);
          source.start(startAt);
          nextPlayTimeRef.current = startAt + buffer.duration;
        } catch {
          // ignore playback errors
        }
      },
      onTranscript: (role, text) => {
        setTranscripts((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === role) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + text },
            ];
          }
          return [...prev, { id: nextIdRef.current++, role, text }];
        });
      },
      onToolCall: (name, args) => {
        setToolLogs((prev) => [
          ...prev,
          { id: nextIdRef.current++, type: "call", name, payload: args },
        ]);
      },
      onToolResult: (name, result) => {
        setToolLogs((prev) => [
          ...prev,
          { id: nextIdRef.current++, type: "result", name, payload: result },
        ]);
      },
      onError: (message) => {
        setError(message);
        setStatus("error");
      },
      onEnded: () => {
        setStatus("ended");
      },
    });

    capture
      .start({
        onChunk: (base64) => {
          client.sendAudio(base64);
        },
        onError: (err) => {
          setError(err.message);
          setStatus("error");
        },
      })
      .then(() => {
        setStatus("active");
        timerRef.current = setInterval(() => {
          setElapsed((prev) => prev + 1);
        }, 1000);
      });

    return cleanup;
  }, [open, scenarioId, cleanup]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const handleStop = () => {
    cleanup();
    setStatus("ended");
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      const stream = captureRef.current
        ? (captureRef.current as unknown as { stream: MediaStream | null })
            .stream
        : null;
      if (stream) {
        stream.getAudioTracks().forEach((t) => {
          t.enabled = !next;
        });
      }
      return next;
    });
  };

  if (!open) return null;

  const statusLabel =
    status === "connecting"
      ? "接続中..."
      : status === "active"
        ? `通話中 (${formatTime(elapsed)})`
        : status === "ended"
          ? "通話終了"
          : "エラー";

  const statusColor =
    status === "active"
      ? "text-success"
      : status === "error"
        ? "text-danger"
        : status === "ended"
          ? "text-muted"
          : "text-warning";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"
        aria-label="閉じる"
        onClick={handleClose}
      />

      <div
        className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-[0_8px_32px_rgba(30,20,10,0.10)] animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-primary" />
            <h2 className="text-base font-semibold text-text">テスト通話</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted hover:bg-primary/5 hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              status === "active" && "bg-success animate-pulse",
              status === "connecting" && "bg-warning animate-pulse",
              status === "ended" && "bg-muted",
              status === "error" && "bg-danger",
            )}
          />
          <span className={cn("text-sm font-medium", statusColor)}>
            {statusLabel}
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Transcript section */}
        <div className="flex-1 overflow-y-auto px-5 py-3" style={{ minHeight: "160px", maxHeight: "280px" }}>
          <p className="mb-2 text-xs font-medium text-muted">
            トランスクリプト
          </p>
          {transcripts.length === 0 ? (
            <p className="text-xs text-muted/60">
              {status === "active"
                ? "会話を開始してください..."
                : "トランスクリプトはまだありません"}
            </p>
          ) : (
            <div className="space-y-2">
              {transcripts.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex gap-2 text-sm",
                    entry.role === "model" ? "text-text" : "text-muted-foreground",
                  )}
                >
                  <span className="shrink-0 text-xs leading-5">
                    {entry.role === "model" ? "🤖" : "👤"}
                  </span>
                  <span className="leading-5">{entry.text}</span>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {/* Tool logs section */}
        {toolLogs.length > 0 && (
          <div className="border-t border-border px-5 py-3" style={{ maxHeight: "160px", overflowY: "auto" }}>
            <p className="mb-2 text-xs font-medium text-muted">
              ツール呼び出し
            </p>
            <div className="space-y-1.5">
              {toolLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 text-xs"
                >
                  {entry.type === "call" ? (
                    <>
                      <Wrench size={12} className="mt-0.5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <span className="font-medium text-text">
                          {entry.name}
                        </span>
                        <span className="text-muted">(</span>
                        <code className="break-all text-muted">
                          {JSON.stringify(entry.payload)}
                        </code>
                        <span className="text-muted">)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Badge variant="success" className="shrink-0 mt-px">
                        OK
                      </Badge>
                      <div className="min-w-0">
                        <span className="font-medium text-text">
                          {entry.name}
                        </span>
                        <span className="text-muted"> → </span>
                        <code className="break-all text-muted">
                          {JSON.stringify(entry.payload)}
                        </code>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            disabled={status !== "active"}
            className={cn(muted && "text-danger")}
          >
            {muted ? <MicOff size={14} /> : <Mic size={14} />}
            <span className="ml-1.5">
              {muted ? "ミュート中" : "ミュート"}
            </span>
          </Button>

          {status === "active" || status === "connecting" ? (
            <Button variant="danger" size="sm" onClick={handleStop}>
              <PhoneOff size={14} className="mr-1.5" />
              終了
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleClose}>
              閉じる
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
