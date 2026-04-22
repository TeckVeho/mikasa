"use client";

import type { Node } from "reactflow";

const textareaClass =
  "mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted outline-none transition-shadow focus:ring-2 focus:ring-primary/30";

const inputClass =
  "mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted outline-none transition-shadow focus:ring-2 focus:ring-primary/30";

const labelClass = "mt-4 block text-xs font-medium text-muted";

export function PropertiesPanel({
  node,
  onChange,
}: {
  node: Node | null;
  onChange: (id: string, data: Record<string, unknown>) => void;
}) {
  if (!node) {
    return (
      <div className="flex w-80 shrink-0 items-start border-l border-border bg-sidebar p-5 text-sm text-muted">
        ノードをクリックして設定を表示
      </div>
    );
  }

  const patch = (p: Record<string, unknown>) => onChange(node.id, p);

  if (node.type === "speak") {
    const d = node.data as {
      text: string;
      speed: number;
      source?: "tts" | "template";
      templateId?: string;
    };
    return (
      <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <p className="text-sm font-semibold text-text">発話</p>
        <label className={labelClass}>ソース</label>
        <select
          className={inputClass}
          value={d.source ?? "tts"}
          onChange={(e) =>
            patch({ source: e.target.value as "tts" | "template" })
          }
        >
          <option value="tts">TTS 合成</option>
          <option value="template">音声テンプレート</option>
        </select>
        {(d.source ?? "tts") === "template" && (
          <>
            <label className={labelClass}>テンプレート ID</label>
            <input
              className={inputClass}
              value={d.templateId ?? ""}
              onChange={(e) => patch({ templateId: e.target.value })}
              placeholder="VoiceTemplate の ID"
            />
          </>
        )}
        <label className={labelClass}>テキスト</label>
        <textarea
          className={textareaClass}
          rows={5}
          value={d.text}
          onChange={(e) => patch({ text: e.target.value })}
          placeholder="読み上げテキスト"
        />
        <label className={labelClass}>
          速度 {d.speed ?? 1}
        </label>
        <input
          type="range"
          min={0.8}
          max={1.5}
          step={0.05}
          value={d.speed ?? 1}
          onChange={(e) => patch({ speed: Number(e.target.value) })}
          className="mt-2 w-full accent-primary"
        />
      </div>
    );
  }

  if (node.type === "listen") {
    const d = node.data as {
      variableName: string;
      timeoutSeconds?: number;
      retryCount?: number;
      retryText?: string;
      excludeNumbers?: boolean;
      noRetryOnFail?: boolean;
      kanaConversion?: "none" | "name" | "all";
    };
    return (
      <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <p className="text-sm font-semibold text-text">ヒアリング</p>
        <label className={labelClass}>変数名</label>
        <input
          className={inputClass}
          value={d.variableName}
          onChange={(e) => patch({ variableName: e.target.value })}
        />
        <label className={labelClass}>タイムアウト（秒）</label>
        <input
          type="number"
          className={inputClass}
          value={d.timeoutSeconds ?? 7}
          onChange={(e) =>
            patch({ timeoutSeconds: Number(e.target.value) })
          }
        />
        <label className={labelClass}>リトライ回数</label>
        <input
          type="number"
          className={inputClass}
          value={d.retryCount ?? 2}
          onChange={(e) => patch({ retryCount: Number(e.target.value) })}
        />
        <label className={labelClass}>リトライ時の文言</label>
        <input
          className={inputClass}
          value={d.retryText ?? ""}
          onChange={(e) => patch({ retryText: e.target.value })}
        />
        <label className="mt-4 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={d.excludeNumbers ?? false}
            onChange={(e) => patch({ excludeNumbers: e.target.checked })}
          />
          数字を除外
        </label>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={d.noRetryOnFail ?? false}
            onChange={(e) => patch({ noRetryOnFail: e.target.checked })}
          />
          認識不可時にリトライしない
        </label>
        <label className={labelClass}>カナ変換</label>
        <select
          className={inputClass}
          value={d.kanaConversion ?? "none"}
          onChange={(e) =>
            patch({
              kanaConversion: e.target.value as "none" | "name" | "all",
            })
          }
        >
          <option value="none">なし</option>
          <option value="name">氏名向け</option>
          <option value="all">すべて</option>
        </select>
      </div>
    );
  }

  if (node.type === "branch") {
    const d = node.data as {
      method: "ai" | "keyword";
      branches: Array<{ id: string; label: string; keywords?: string[] }>;
      defaultNextNodeId: string;
      inputVariable: string;
      aiPrompt?: string;
    };
    return (
      <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <p className="text-sm font-semibold text-text">分岐</p>
        <label className={labelClass}>方式</label>
        <select
          className={inputClass}
          value={d.method}
          onChange={(e) =>
            patch({ method: e.target.value as "ai" | "keyword" })
          }
        >
          <option value="ai">AI 分類</option>
          <option value="keyword">キーワード</option>
        </select>
        <label className={labelClass}>入力変数</label>
        <input
          className={inputClass}
          value={d.inputVariable}
          onChange={(e) => patch({ inputVariable: e.target.value })}
        />
        {d.method === "ai" && (
          <>
            <label className={labelClass}>AI プロンプト</label>
            <textarea
              className={textareaClass}
              rows={3}
              value={d.aiPrompt ?? ""}
              onChange={(e) => patch({ aiPrompt: e.target.value })}
            />
          </>
        )}
        <label className={labelClass}>デフォルト遷移先ノード ID</label>
        <input
          className={inputClass}
          value={d.defaultNextNodeId}
          onChange={(e) => patch({ defaultNextNodeId: e.target.value })}
        />
        <p className="mt-4 text-xs text-muted">分岐ラベルはノード上で編集し、線で接続してください。</p>
      </div>
    );
  }

  if (node.type === "api_call") {
    const d = node.data as {
      url: string;
      method: "GET" | "POST" | "PUT";
      headers: Record<string, string>;
      timeoutMs?: number;
      responseMapping: Array<{ jsonPath: string; variableName: string }>;
    };
    return (
      <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <p className="text-sm font-semibold text-text">API 呼び出し</p>
        <label className={labelClass}>URL</label>
        <input
          className={inputClass}
          value={d.url}
          onChange={(e) => patch({ url: e.target.value })}
        />
        <label className={labelClass}>メソッド</label>
        <select
          className={inputClass}
          value={d.method}
          onChange={(e) =>
            patch({ method: e.target.value as "GET" | "POST" | "PUT" })
          }
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
        </select>
        <label className={labelClass}>タイムアウト (ms)</label>
        <input
          type="number"
          className={inputClass}
          value={d.timeoutMs ?? 5000}
          onChange={(e) => patch({ timeoutMs: Number(e.target.value) })}
        />
        <label className={labelClass}>ヘッダー (JSON)</label>
        <textarea
          className={textareaClass}
          rows={3}
          value={JSON.stringify(d.headers ?? {}, null, 0)}
          onChange={(e) => {
            try {
              patch({ headers: JSON.parse(e.target.value) as Record<string, string> });
            } catch {
              /* ignore */
            }
          }}
        />
        <label className={labelClass}>レスポンスマッピング (JSON 配列)</label>
        <textarea
          className={textareaClass}
          rows={4}
          value={JSON.stringify(d.responseMapping ?? [], null, 2)}
          onChange={(e) => {
            try {
              patch({
                responseMapping: JSON.parse(e.target.value) as Array<{
                  jsonPath: string;
                  variableName: string;
                }>,
              });
            } catch {
              /* ignore */
            }
          }}
        />
      </div>
    );
  }

  if (node.type === "sms") {
    const d = node.data as { to: string; body: string };
    return (
      <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5">
        <p className="text-sm font-semibold text-text">SMS</p>
        <label className={labelClass}>宛先</label>
        <input
          className={inputClass}
          value={d.to}
          onChange={(e) => patch({ to: e.target.value })}
        />
        <label className={labelClass}>本文</label>
        <textarea
          className={textareaClass}
          rows={5}
          value={d.body}
          onChange={(e) => patch({ body: e.target.value })}
        />
      </div>
    );
  }

  if (node.type === "transfer") {
    const d = node.data as {
      to: string;
      timeout: number;
      onNoAnswer: string;
    };
    return (
      <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5">
        <p className="text-sm font-semibold text-text">転送</p>
        <label className={labelClass}>転送先番号</label>
        <input
          className={inputClass}
          value={d.to}
          onChange={(e) => patch({ to: e.target.value })}
        />
        <label className={labelClass}>タイムアウト（秒）</label>
        <input
          type="number"
          className={inputClass}
          value={d.timeout}
          onChange={(e) => patch({ timeout: Number(e.target.value) })}
        />
        <label className={labelClass}>応答なし時の遷移先ノード ID</label>
        <input
          className={inputClass}
          value={d.onNoAnswer}
          onChange={(e) => patch({ onNoAnswer: e.target.value })}
        />
      </div>
    );
  }

  if (node.type === "end") {
    const d = node.data as { farewell?: string };
    return (
      <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5">
        <p className="text-sm font-semibold text-text">終了</p>
        <label className={labelClass}>終話メッセージ</label>
        <textarea
          className={textareaClass}
          rows={4}
          value={d.farewell ?? ""}
          onChange={(e) => patch({ farewell: e.target.value })}
        />
      </div>
    );
  }

  if (node.type === "dtmf") {
    const d = node.data as {
      promptText: string;
      variableName: string;
      numDigits: number;
      timeoutSeconds: number;
      speed?: number;
      branches: Array<{ id: string; digit: string; label: string }>;
      defaultNextNodeId: string;
    };
    return (
      <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <p className="text-sm font-semibold text-text">DTMF / IVR</p>
        <label className={labelClass}>ガイダンス</label>
        <textarea
          className={textareaClass}
          rows={3}
          value={d.promptText}
          onChange={(e) => patch({ promptText: e.target.value })}
        />
        <label className={labelClass}>桁数</label>
        <input
          type="number"
          className={inputClass}
          value={d.numDigits}
          onChange={(e) => patch({ numDigits: Number(e.target.value) })}
        />
        <label className={labelClass}>タイムアウト（秒）</label>
        <input
          type="number"
          className={inputClass}
          value={d.timeoutSeconds}
          onChange={(e) =>
            patch({ timeoutSeconds: Number(e.target.value) })
          }
        />
        <label className={labelClass}>変数名</label>
        <input
          className={inputClass}
          value={d.variableName}
          onChange={(e) => patch({ variableName: e.target.value })}
        />
        <label className={labelClass}>デフォルト遷移先ノード ID</label>
        <input
          className={inputClass}
          value={d.defaultNextNodeId}
          onChange={(e) => patch({ defaultNextNodeId: e.target.value })}
        />
        <p className="mt-3 text-xs text-muted">分岐はハンドルでノード接続してください。</p>
      </div>
    );
  }

  if (node.type === "ai_agent") {
    const d = node.data as {
      systemPrompt: string;
      slots: Array<{
        name: string;
        description: string;
        required: boolean;
        variableName: string;
      }>;
      maxTurns: number;
      openingLine?: string;
    };
    return (
      <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
        <p className="text-sm font-semibold text-text">AI エージェント</p>
        <label className={labelClass}>システムプロンプト</label>
        <textarea
          className={textareaClass}
          rows={5}
          value={d.systemPrompt}
          onChange={(e) => patch({ systemPrompt: e.target.value })}
        />
        <label className={labelClass}>冒頭の一言（任意）</label>
        <textarea
          className={textareaClass}
          rows={2}
          value={d.openingLine ?? ""}
          onChange={(e) => patch({ openingLine: e.target.value })}
        />
        <label className={labelClass}>最大ターン数</label>
        <input
          type="number"
          className={inputClass}
          value={d.maxTurns}
          onChange={(e) => patch({ maxTurns: Number(e.target.value) })}
        />
        <label className={labelClass}>スロット (JSON)</label>
        <textarea
          className={textareaClass}
          rows={8}
          value={JSON.stringify(d.slots ?? [], null, 2)}
          onChange={(e) => {
            try {
              patch({ slots: JSON.parse(e.target.value) });
            } catch {
              /* ignore */
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-80 shrink-0 border-l border-border bg-sidebar p-5 text-sm text-muted">
      このノードタイプの詳細は上記リストから選択してください
    </div>
  );
}
