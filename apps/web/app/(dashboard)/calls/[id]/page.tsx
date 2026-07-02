"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { apiJson } from "@/lib/api";
import { parseTranscriptText } from "@/lib/parse-transcript";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, Link2 } from "lucide-react";

type CallDetail = {
  id: string;
  callerNumber: string;
  duration: number | null;
  status: string;
  transcriptText: string | null;
  transcriptSegments?: Array<{
    startMs: number;
    endMs: number;
    text: string;
  }> | null;
  summaryText: string | null;
  structuredData?: Record<string, string>;
  audioUrl?: string;
  operatorNote: string;
  callbackDone?: boolean;
  createdAt: string;
  /** 公開確認フォーム用の署名付きトークン */
  publicFormToken?: string | null;
};

const textareaClass =
  "mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-muted outline-none transition-shadow focus:ring-2 focus:ring-primary/30";

const fieldLabelMap: Record<string, string> = {
  name: "名前",
  address: "住所",
  preferredDatetime: "希望日時",
  purpose: "用件",
};

function mapFieldValue(key: string, value: string): string {
  if (key === "purpose" && value === "redelivery") return "再配達";
  return value;
}

function statusVariant(status: string): "success" | "warning" | "neutral" {
  if (status === "completed" || status === "resolved") return "success";
  if (status === "pending") return "warning";
  return "neutral";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: "完結",
    resolved: "完結",
    pending: "対応中",
    missed: "不在",
    callback: "折り返し待ち",
  };
  return map[status] ?? status;
}

const formatDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function AudioPlayer({
  url,
  segments,
}: {
  url: string;
  segments?: Array<{ startMs: number; endMs: number; text: string }> | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const speeds = [1, 1.5, 2] as const;

  const seekToMs = (ms: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = ms / 1000;
    setCurrentTime(el.currentTime);
    void el.play();
    setPlaying(true);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
    setPlaying(!playing);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  };

  const cycleSpeed = () => {
    const el = audioRef.current;
    if (!el) return;
    const idx = speeds.indexOf(speed as (typeof speeds)[number]);
    const next = speeds[(idx + 1) % speeds.length];
    el.playbackRate = next;
    setSpeed(next);
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h2 className="mb-3 text-base font-medium text-text">音声</h2>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>{formatDuration(Math.floor(currentTime))}</span>
            <span>{formatDuration(Math.floor(duration))}</span>
          </div>
        </div>
        <button
          onClick={cycleSpeed}
          className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-bg transition-colors"
        >
          {speed}x
        </button>
      </div>
      {segments && segments.length > 0 && (
        <ul className="mt-4 max-h-40 overflow-y-auto space-y-1 border-t border-border pt-3">
          {segments.map((s, i) => (
            <li key={`${s.startMs}-${i}`}>
              <button
                type="button"
                className="w-full text-left text-xs text-primary hover:underline"
                onClick={() => seekToMs(s.startMs)}
              >
                <span className="text-muted tabular-nums">
                  {formatDuration(Math.floor(s.startMs / 1000))}
                </span>{" "}
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TranscriptConversation({
  transcriptText,
}: {
  transcriptText: string | null;
}) {
  const messages = parseTranscriptText(transcriptText);

  if (messages.length === 0) {
    return <p className="text-sm text-muted">（なし）</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        return (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                isUser
                  ? "bg-primary/10 text-text"
                  : "bg-bg text-text border border-border"
              }`}
            >
              <p className="text-xs font-medium text-muted mb-1">
                {isUser ? "お客様" : "AI"}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.text}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CallDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const q = useQuery({
    queryKey: ["call", id],
    queryFn: async () => {
      const r = await apiJson<CallDetail>(`/v1/calls/${id}`);
      if (!r.ok) throw new Error(r.message ?? r.error);
      return r.data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const r = await apiJson(`/v1/calls/${id}/note`, {
        method: "PATCH",
        body: JSON.stringify({ operatorNote: note }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call", id] }),
  });

  const markCallback = useMutation({
    mutationFn: async () => {
      const r = await apiJson(`/v1/calls/${id}/note`, {
        method: "PATCH",
        body: JSON.stringify({ callbackDone: true }),
      });
      if (!r.ok) throw new Error(r.message ?? r.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call", id] }),
  });

  useEffect(() => {
    if (q.data?.operatorNote !== undefined) {
      setNote(q.data.operatorNote);
    }
  }, [q.data?.operatorNote]);

  if (q.isLoading) {
    return (
      <div>
        <PageHeader title="通話詳細" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return <p className="text-sm text-muted animate-pulse">見つかりません</p>;
  }

  const d = q.data;
  const createdAt = new Date(d.createdAt);
  const dateStr = createdAt.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="通話詳細" />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左カラム: 音声・文字起こし・AI要約 */}
        <div className="flex flex-col gap-4">
          {d.audioUrl && (
            <AudioPlayer url={d.audioUrl} segments={d.transcriptSegments} />
          )}

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-medium text-text">文字起こし</h2>
            <div className="mt-3 max-h-96 overflow-y-auto">
              <TranscriptConversation transcriptText={d.transcriptText} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-medium text-text">AI 要約</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {d.summaryText ?? "—"}
            </p>
          </div>
        </div>

        {/* 右カラム: 通話情報・ヒアリング結果・メモ */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-medium text-text">通話情報</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">日時</dt>
                <dd className="text-text">{dateStr}</dd>
              </div>
              {d.duration !== null && d.duration !== undefined && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">通話時間</dt>
                  <dd className="text-text">
                    {Math.floor(d.duration / 60)}分{String(d.duration % 60).padStart(2, "0")}秒
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2 items-center">
                <dt className="text-muted">ステータス</dt>
                <dd>
                  <Badge variant={statusVariant(d.status)}>
                    {statusLabel(d.status)}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">発信番号</dt>
                <dd className="text-text">{d.callerNumber}</dd>
              </div>
              {d.publicFormToken && (
                <div className="pt-3 border-t border-border mt-3">
                  <dt className="text-xs text-muted mb-2">公開確認フォーム</dt>
                  <dd>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        const path = `/forms/${encodeURIComponent(d.publicFormToken!)}`;
                        const absolute =
                          typeof window !== "undefined"
                            ? `${window.location.origin}${path}`
                            : path;
                        void navigator.clipboard.writeText(absolute);
                      }}
                    >
                      <Link2 size={14} />
                      リンクをコピー
                    </Button>
                  </dd>
                  <p className="mt-2 text-xs text-muted">
                    お客様が内容を確認・修正するための署名付き URL です。
                  </p>
                </div>
              )}
            </dl>
          </div>

          {d.structuredData && Object.keys(d.structuredData).length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-medium text-text">ヒアリング結果</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {Object.entries(d.structuredData).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <dt className="text-muted">{fieldLabelMap[key] ?? key}</dt>
                    <dd className="text-text text-right">{mapFieldValue(key, value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-medium text-text">オペレーターメモ</h2>
            <textarea
              className={textareaClass}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="メモを入力..."
            />
            <Button
              className="mt-3"
              size="sm"
              onClick={() => save.mutate()}
              loading={save.isPending}
            >
              保存
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-medium text-text">アクション</h2>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => markCallback.mutate()}
                loading={markCallback.isPending}
                disabled={d.callbackDone === true}
              >
                {d.callbackDone ? "折り返し済み" : "折り返し済みにする"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
