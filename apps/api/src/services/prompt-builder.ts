export type PronunciationEntry = {
  word: string;
  reading: string;
  category?: string;
};

export type PromptBuildInput = {
  persona: string;
  conversationRules: string;
  businessKnowledge: string;
  guardRails: string;
  toolDefinitions: unknown[];
  voiceName: string;
  languageCode: string;
  tenantName: string;
  callerNumber: string;
  recentSummaries?: string[];
  pronunciationDictionary?: PronunciationEntry[];
};

const BUILT_IN_TOOLS = [
  {
    name: "transfer_to_operator",
    description: "人間のオペレーターに転送します。",
    parameters: {
      type: "OBJECT",
      properties: {
        reason: {
          type: "STRING",
          description: "転送する理由",
        },
        collected_info: {
          type: "OBJECT",
          description: "これまでに収集した情報",
        },
        priority: {
          type: "STRING",
          enum: ["low", "normal", "high", "urgent"],
          description: "転送の優先度",
        },
        department: {
          type: "STRING",
          enum: ["general", "claims", "international", "corporate"],
          description: "転送先部署",
        },
      },
      required: ["reason", "priority"],
    },
  },
  {
    name: "register_callback",
    description:
      "折り返し電話のリクエストをデータベースに登録します。" +
      "【必ず呼び出す条件】お客様情報のヒアリング（お名前・電話番号・用件）が完了し、" +
      "最終確認で「はい」等の同意を得たら、クロージング文言を発話する前に必ずこのツールを呼び出してください。" +
      "このツールを呼び出さずに「うけたまわりました」「おりかえしごれんらくいたします」と発話することは禁止です。",
    parameters: {
      type: "OBJECT",
      properties: {
        reason: {
          type: "STRING",
          description: "折り返しが必要な理由・用件の概要",
        },
        caller_name: {
          type: "STRING",
          description: "お客様のお名前",
        },
        company_name: {
          type: "STRING",
          description: "会社名（法人の場合）",
        },
        callback_number: {
          type: "STRING",
          description: "折り返し先の電話番号（未指定の場合は発信者番号）",
        },
        preferred_time: {
          type: "STRING",
          description: "お客様の希望時間帯（例: 午後2時頃、本日中 など）",
        },
        collected_info: {
          type: "OBJECT",
          description: "その他ヒアリングした情報",
        },
      },
      required: ["reason"],
    },
  },
];

export function buildPronunciationDictionarySection(
  entries: PronunciationEntry[],
): string | null {
  if (entries.length === 0) return null;

  const lines = entries.map(
    (entry) => `  - 「${entry.reading}」（「${entry.word}」と書かない）`,
  );

  return `**読み方辞書（必ず指定の読みで出力する）:**
${lines.join("\n")}`;
}

export function buildSystemInstruction(input: PromptBuildInput): string {
  const sections: string[] = [];

  sections.push(`**ペルソナ:**\n${input.persona}`);
  sections.push(`**対話ルール:**\n${input.conversationRules}`);
  sections.push(`**業務ナレッジ:**\n${input.businessKnowledge}`);
  sections.push(`**ガードレール:**\n${input.guardRails}`);
  sections.push(`**利用可能なツール:**
- **transfer_to_operator**: お客様が人間のオペレーターとの会話を希望した場合、またはAIでは解決できない問題の場合に使用します。
- **register_callback**: 折り返し対応が必要な場合に、ヒアリング完了後に必ず使用してください。
  - お客様のお名前・会社名・折り返し先電話番号・用件概要・希望時間帯を聞き取り、最終確認で同意を得た **直後** に呼び出す
  - **クロージング文言を発話する前に** 必ず register_callback を呼び出す（発話と同時・発話後は禁止）
  - register_callback を呼び出さずに「うけたまわりました」「おりかえしごれんらくいたします」と発話することは **絶対禁止**
  - 転送できない設定の場合も、折り返し対応時は必ずこのツールを使う
  - ツール呼び出し後は、シナリオの STEP 4 クロージング文言を **1回だけ** 伝えて通話を終了する（同じ内容の繰り返し禁止）`);

  sections.push(`**発話ルール:**
- すべてにほんごで応答する。
- あなたは音声で話している。出力テキストはすべてひらがなとカタカナのみで書く（漢字は使わない）。
- 迷ったらひらがなにする。自然さより正確さを優先する。
- 以下の言い回しはかならず指定の読みで出力する:
  - 「たとえば」（「例えば」と書かない）
  - 「おそれはいります」（「恐れ入ります」と書かない）
  - 「うけたまわりました」（「承りました」と書かない）
  - 「しょうちしました」（「承知しました」と書かない）
  - 「かしこまりました」
  - 「おっしゃる」「ください」「いたします」「ございます」「なにとぞ」
  - 「こちら」「そちら」「おおむね」
- 数字・住所・人名はひと文字ずつ区切って話す。
- 固有名詞は無理に読まず、おきゃくさまに確認を取る。`);

  const pronunciationSection = buildPronunciationDictionarySection(
    input.pronunciationDictionary ?? [],
  );
  if (pronunciationSection) {
    sections.push(pronunciationSection);
  }

  sections.push(`**重要:**
- 通話が開始されたら、ユーザーの発話を待たずに、あなたから最初にあいさつしてください。
- あいさつのあと、必ず「ごようけんをおうかがいいたします」と用件を質問してください。
- 例:「おでんわありがとうございます。○○でございます。ごようけんをおうかがいいたします。」`);

  return sections.join("\n\n");
}

const TOOL_META_KEYS = ["_endpoint", "_method", "_headers", "_timeout"] as const;

/** Gemini には渡さないカスタムツールのメタデータキー */
export function stripToolMetadata(tool: unknown): unknown {
  if (!tool || typeof tool !== "object" || Array.isArray(tool)) return tool;
  const copy = { ...(tool as Record<string, unknown>) };
  for (const key of TOOL_META_KEYS) {
    delete copy[key];
  }
  return copy;
}

const SCHEMA_TYPE_MAP: Record<string, string> = {
  object: "OBJECT",
  string: "STRING",
  number: "NUMBER",
  integer: "INTEGER",
  boolean: "BOOLEAN",
  array: "ARRAY",
};

function normalizeSchemaTypes(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeSchemaTypes);
  if (typeof obj !== "object") return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "type" && typeof value === "string") {
      result[key] = SCHEMA_TYPE_MAP[value] ?? value;
    } else {
      result[key] = normalizeSchemaTypes(value);
    }
  }
  return result;
}

export function buildToolDeclarations(userTools: unknown[]): unknown[] {
  const userOnly = userTools.map(stripToolMetadata);
  const all = [...userOnly, ...BUILT_IN_TOOLS];
  return all.map(normalizeSchemaTypes);
}

export function buildInitialContext(input: {
  callerNumber: string;
  recentSummaries?: string[];
}): string {
  const lines: string[] = [];

  lines.push(`発信者番号: ${input.callerNumber}`);

  if (input.recentSummaries && input.recentSummaries.length > 0) {
    lines.push("");
    lines.push("直近の通話履歴:");
    for (const summary of input.recentSummaries) {
      lines.push(`- ${summary}`);
    }
  }

  return lines.join("\n");
}
