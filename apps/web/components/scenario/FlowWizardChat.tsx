"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/api";
import type { FlowJson } from "@logivoice/shared";

export type FlowWizardResult = {
  suggestedName: string;
  flowJson: FlowJson;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type WizardApiResponse = {
  reply: string;
  partialResult: FlowWizardResult | null;
  isComplete: boolean;
};

type Props = {
  onComplete: (result: FlowWizardResult) => void;
  onCancel: () => void;
};

const QUICK_TEMPLATES = [
  { icon: "📦", label: "再配達受付", prompt: "再配達の電話受付フローを作りたいです" },
  { icon: "📅", label: "予約受付", prompt: "予約受付の電話対応フローを作りたいです" },
  { icon: "❓", label: "FAQ対応", prompt: "よくある質問に自動応答するフローを作りたいです" },
  { icon: "📞", label: "クレーム対応", prompt: "クレーム受付・オペレーター転送のフローを作りたいです" },
];

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-sm text-muted">考え中</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60"
            style={{
              animation: "wizard-bounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </span>
    </span>
  );
}

export function FlowWizardChat({ onComplete, onCancel }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const sendToApi = useCallback(
    async (allMessages: ChatMessage[]) => {
      setLoading(true);
      try {
        const res = await apiJson<WizardApiResponse>("/v1/scenarios/ai-wizard", {
          method: "POST",
          body: JSON.stringify({ messages: allMessages }),
        });
        if (!res.ok) {
          const errMsg = res.message ?? res.error;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `エラーが発生しました: ${errMsg}` },
          ]);
          return;
        }
        const { reply, partialResult, isComplete } = res.data;
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

        if (isComplete && partialResult) {
          setTimeout(() => onComplete(partialResult), 600);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "通信エラーが発生しました。もう一度お試しください。" },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [onComplete],
  );

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    void sendToApi([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  function handleSend(text?: string) {
    const value = (text ?? input).trim();
    if (!value || loading) return;

    const userMsg: ChatMessage = { role: "user", content: value };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    void sendToApi(next);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const showTemplates = messages.length <= 1 && !loading;

  return (
    <div className="animate-fade-in-up flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <style>{`
        @keyframes wizard-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Sparkles size={22} className="text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            シナリオ作成アシスタント
          </h1>
        </div>
        <p className="text-sm text-muted">
          AIとの対話でシナリオフローを自動生成します。生成後はエディタで自由に編集できます。
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-surface flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Bot size={14} className="text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary/10 text-text"
                    : "bg-bg text-text",
                )}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-border/60">
                  <User size={14} className="text-muted" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="rounded-xl bg-bg px-4 py-3">
                <ThinkingDots />
              </div>
            </div>
          )}
        </div>

        {/* Quick templates */}
        {showTemplates && (
          <div className="border-t border-border px-5 py-3">
            <p className="text-xs text-muted mb-2">クイックテンプレート</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => handleSend(t.prompt)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text transition-all hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border px-4 py-3 flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted/60 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
            style={{ maxHeight: "120px" }}
          />
          <Button
            size="sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="shrink-0"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>

      {/* Cancel */}
      <div className="mt-4 flex justify-start">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
          手動作成に戻る
        </Button>
      </div>
    </div>
  );
}
