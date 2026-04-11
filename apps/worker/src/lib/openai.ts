import OpenAI from "openai";

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export async function summarizeTranscript(transcriptText: string): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("OPENAI_API_KEY missing");
  const res = await client.chat.completions.create({
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
  });
  return res.choices[0]?.message?.content ?? "";
}
