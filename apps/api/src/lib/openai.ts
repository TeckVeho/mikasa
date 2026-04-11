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
