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
      "折り返し電話のリクエストを登録します。オペレーターに転送できない場合や、お客様が折り返しを希望した場合に使用してください。",
    parameters: {
      type: "OBJECT",
      properties: {
        reason: {
          type: "STRING",
          description: "折り返しが必要な理由",
        },
        preferred_time: {
          type: "STRING",
          description: "お客様の希望時間帯（例: 午後2時頃、本日中 など）",
        },
      },
      required: ["reason"],
    },
  },
];

export function buildSystemInstruction(input: PromptBuildInput): string {
  const sections: string[] = [];

  sections.push(`**ペルソナ:**\n${input.persona}`);
  sections.push(`**対話ルール:**\n${input.conversationRules}`);
  sections.push(`**業務ナレッジ:**\n${input.businessKnowledge}`);
  sections.push(`**ガードレール:**\n${input.guardRails}`);
  sections.push(`**利用可能なツール:**
- **transfer_to_operator**: お客様が人間のオペレーターとの会話を希望した場合、またはAIでは解決できない問題の場合に使用します。
- **register_callback**: 以下のいずれかに該当する場合に必ず使用してください。
  - お客様が「折り返し電話がほしい」「後で連絡してほしい」と希望した場合
  - オペレーターへの転送ができない・不在の場合に、折り返し対応を提案する場合
  - 営業時間外の問い合わせで、後日の対応が必要な場合
  折り返しを登録した後は「折り返しのご連絡を手配いたしました」とお客様にお伝えしてください。`);

  sections.push(`**発話ルール:**
- すべてにほんごで応答する。
- あなたは音声で話している。漢字は「読み」ではなく「音」になる。
- 誤読リスクがある漢字は使わず、ひらがなで話す。
- 迷ったらひらがなにする。自然さより正確さを優先する。
- ていねい語の定型句はひらがなで話す:
  「うけたまわりました」「かしこまりました」「おっしゃる」
  「ください」「いたします」「ございます」「なにとぞ」
  「こちら」「そちら」「おおむね」
- 数字・住所・人名はひと文字ずつ区切って話す。
- 固有名詞は無理に読まず、おきゃくさまに確認を取る。`);

  sections.push("**重要:** 通話が開始されたら、ユーザーの発話を待たずに、あなたから最初にあいさつしてください。例:「おでんわありがとうございます。ごようけんをおうかがいいたします。」のように自然に話し始めてください。");

  return sections.join("\n\n");
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
  const all = [...(userTools as unknown[]), ...BUILT_IN_TOOLS];
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
