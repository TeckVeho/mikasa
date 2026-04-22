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
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "転送する理由",
        },
        collected_info: {
          type: "object",
          description: "これまでに収集した情報",
        },
        priority: {
          type: "string",
          enum: ["low", "normal", "high", "urgent"],
          description: "転送の優先度",
        },
        department: {
          type: "string",
          enum: ["general", "claims", "international", "corporate"],
          description: "転送先部署",
        },
      },
      required: ["reason", "priority"],
    },
  },
  {
    name: "send_sms",
    description: "SMSを送信します。",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "送信先電話番号",
        },
        body: {
          type: "string",
          description: "メッセージ本文",
        },
      },
      required: ["to", "body"],
    },
  },
];

export function buildSystemInstruction(input: PromptBuildInput): string {
  const sections: string[] = [];

  sections.push(`**ペルソナ:**\n${input.persona}`);
  sections.push(`**対話ルール:**\n${input.conversationRules}`);
  sections.push(`**業務ナレッジ:**\n${input.businessKnowledge}`);
  sections.push(`**ガードレール:**\n${input.guardRails}`);
  sections.push("日本語で応答してください。必ず日本語で応答してください。");

  return sections.join("\n\n");
}

export function buildToolDeclarations(userTools: unknown[]): unknown[] {
  return [...(userTools as unknown[]), ...BUILT_IN_TOOLS];
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
