export type TranscriptMessage = {
  role: "user" | "ai";
  text: string;
};

const USER_PREFIX = /^お客様:\s*(.*)$/;
const AI_PREFIX = /^AI:\s*(.*)$/;

/**
 * transcriptText を対話メッセージに変換する。
 * Gemini Live の話者ラベル付き行は同一話者の連続行を結合する。
 * ラベルなし行（AmiVoice 等）は各行をお客様の発話として扱う。
 */
export function parseTranscriptText(
  transcript: string | null | undefined,
): TranscriptMessage[] {
  if (!transcript?.trim()) return [];

  const messages: TranscriptMessage[] = [];

  for (const rawLine of transcript.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const userMatch = line.match(USER_PREFIX);
    const aiMatch = line.match(AI_PREFIX);

    let role: "user" | "ai";
    let text: string;
    let mergeWithPrevious = false;

    if (userMatch) {
      role = "user";
      text = userMatch[1] ?? "";
      mergeWithPrevious = true;
    } else if (aiMatch) {
      role = "ai";
      text = aiMatch[1] ?? "";
      mergeWithPrevious = true;
    } else {
      role = "user";
      text = line;
      mergeWithPrevious = false;
    }

    const last = messages[messages.length - 1];
    if (mergeWithPrevious && last && last.role === role) {
      last.text += text;
      continue;
    }

    messages.push({ role, text });
  }

  return messages;
}
