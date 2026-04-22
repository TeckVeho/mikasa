import OpenAI from "openai";
import type { Result } from "@logivoice/shared";
import { withRetry } from "./with-retry.js";

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, timeout: 30000 });
}

export async function classifyIntent(input: {
  utterance: string;
  labels: string[];
  aiPrompt?: string;
}): Promise<Result<{ label: string }>> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "OpenAI not configured", code: "OPENAI_ERROR" };
  }
  const userContent = [
    `発話: "${input.utterance}"`,
    `分類ラベル: ${JSON.stringify(input.labels)}`,
    input.aiPrompt ? `補足: ${input.aiPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const wrapped = await withRetry(async () => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "あなたは日本の物流会社のコールセンターAIです。発話内容を与えられた分類ラベルのいずれかに分類してください。必ず {\"label\": \"<ラベル名>\"} のJSONのみを返してください。",
            },
            { role: "user", content: userContent },
          ],
          max_tokens: 50,
          temperature: 0,
          response_format: { type: "json_object" },
        },
        { signal: controller.signal },
      );
      return res;
    } finally {
      clearTimeout(t);
    }
  });

  if (!wrapped.ok) {
    return { ok: false, error: wrapped.message, code: "OPENAI_ERROR" };
  }
  const text = wrapped.data.choices[0]?.message?.content;
  if (!text) {
    return { ok: false, error: "empty response", code: "OPENAI_ERROR" };
  }
  try {
    const parsed = JSON.parse(text) as { label?: string };
    if (!parsed.label) {
      return { ok: false, error: "invalid json", code: "OPENAI_ERROR" };
    }
    return { ok: true, data: { label: parsed.label } };
  } catch {
    return { ok: false, error: "parse error", code: "OPENAI_ERROR" };
  }
}

export async function summarizeTranscript(
  transcriptText: string,
): Promise<Result<string>> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "OpenAI not configured", code: "OPENAI_ERROR" };
  }
  const wrapped = await withRetry(async () =>
    client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "以下の通話内容を3行以内で要約してください。用件・ヒアリングした情報・対応結果を含めてください。",
        },
        { role: "user", content: transcriptText },
      ],
      max_tokens: 300,
      temperature: 0.3,
    }),
  );
  if (!wrapped.ok) {
    return { ok: false, error: wrapped.message, code: "OPENAI_ERROR" };
  }
  const text = wrapped.data.choices[0]?.message?.content ?? "";
  return { ok: true, data: text };
}

export type AgentConverseInput = {
  systemPrompt: string;
  slots: Array<{
    name: string;
    description: string;
    required: boolean;
    variableName: string;
  }>;
  filledVariables: Record<string, string>;
  conversationHistory: Array<{
    role: "system" | "assistant" | "user";
    content: string;
  }>;
  userUtterance: string | null;
  turn: number;
  maxTurns: number;
};

export type AgentConverseResult = {
  assistantText: string;
  extractedSlots: Record<string, string>;
  allComplete: boolean;
  shouldFail: boolean;
};

/**
 * Hybrid AI agent: slot filling with rephrase / clarification (prompt-level).
 */
export async function agentConverse(
  input: AgentConverseInput,
): Promise<Result<AgentConverseResult>> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "OpenAI not configured", code: "OPENAI_ERROR" };
  }
  const slotDesc = input.slots
    .map(
      (s) =>
        `- ${s.variableName} (${s.name}): ${s.description} required=${s.required}`,
    )
    .join("\n");
  const filled = JSON.stringify(input.filledVariables, null, 0);
  const history = input.conversationHistory
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  const userLine =
    input.userUtterance === null
      ? "（通話開始。最初の挨拶とヒアリングを行ってください。）"
      : `ユーザー発話: "${input.userUtterance}"`;

  const system = [
    input.systemPrompt,
    "",
    "あなたは電話ボイスボットのアシスタントです。次のスロットを埋めてください:",
    slotDesc,
    "",
    "ルール:",
    "- 出力は必ずJSONのみ: {\"assistantText\":\"...\",\"extractedSlots\":{},\"allComplete\":false,\"shouldFail\":false}",
    "- extractedSlots は variableName キーで値を入れる。未取得は省略。",
    "- ユーザーが言い直したら最新の発話でスロットを上書きする。",
    "- 曖昧なら assistantText で具体的に聞き返す。allComplete は必須スロットが全て埋まったときのみ true。",
    "- shouldFail は対話が破綻した場合またはターン上限に近いが未充足が残る場合に true（最後の手段）。",
    `- 現在ターン ${input.turn}/${input.maxTurns}。残りターンが少なく未充足がある場合は確認のフォローを入れる。`,
    "- 不要な情報は無視する。",
    "",
    `現在のスロット値: ${filled}`,
  ].join("\n");

  const user = [history && `これまでの対話:\n${history}`, userLine]
    .filter(Boolean)
    .join("\n\n");

  const wrapped = await withRetry(async () =>
    client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  );
  if (!wrapped.ok) {
    return { ok: false, error: wrapped.message, code: "OPENAI_ERROR" };
  }
  const raw = wrapped.data.choices[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw) as {
      assistantText?: string;
      extractedSlots?: Record<string, string>;
      allComplete?: boolean;
      shouldFail?: boolean;
    };
    const assistantText = parsed.assistantText ?? "もう一度よろしくお願いします。";
    const extractedSlots = parsed.extractedSlots ?? {};
    const allComplete = Boolean(parsed.allComplete);
    const shouldFail = Boolean(parsed.shouldFail);
    return {
      ok: true,
      data: { assistantText, extractedSlots, allComplete, shouldFail },
    };
  } catch {
    return { ok: false, error: "agent json parse error", code: "OPENAI_ERROR" };
  }
}

export async function vocAnalyze(input: {
  summaries: string[];
}): Promise<
  Result<{ topics: string[]; faqCandidates: string[]; sentiment: string }>
> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "OpenAI not configured", code: "OPENAI_ERROR" };
  }
  const wrapped = await withRetry(async () =>
    client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            '直近の通話要約リストから、頻出トピック・FAQ候補・全体の雰囲気をJSONのみで返してください: {"topics":[],"faqCandidates":[],"sentiment":""}',
        },
        { role: "user", content: input.summaries.join("\n---\n") },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.2,
    }),
  );
  if (!wrapped.ok) {
    return { ok: false, error: wrapped.message, code: "OPENAI_ERROR" };
  }
  const raw = wrapped.data.choices[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw) as {
      topics?: string[];
      faqCandidates?: string[];
      sentiment?: string;
    };
    return {
      ok: true,
      data: {
        topics: parsed.topics ?? [],
        faqCandidates: parsed.faqCandidates ?? [],
        sentiment: parsed.sentiment ?? "neutral",
      },
    };
  } catch {
    return { ok: false, error: "voc parse error", code: "OPENAI_ERROR" };
  }
}
