import type { FlowJson, ScenarioFlowNode } from "@logivoice/shared";

export type MigrationResult = {
  persona: string;
  conversationRules: string;
  businessKnowledge: string;
  guardRails: string;
  toolDefinitions: unknown[];
};

const DEFAULT_PERSONA =
  "あなたは電話受付AIアシスタントです。丁寧に対応してください。";
const DEFAULT_GUARD_RAILS =
  "不明な場合は推測せず、オペレーターに転送してください。";

function findEntryNodeId(flow: FlowJson): string | null {
  const targets = new Set(flow.edges.map((e) => e.target));
  const candidates = flow.nodes.filter((n) => !targets.has(n.id));
  if (candidates.length === 0) return flow.nodes[0]?.id ?? null;
  return candidates[0]?.id ?? null;
}

function buildOrderedNodeIds(flow: FlowJson): string[] {
  const entryId = findEntryNodeId(flow);
  if (!entryId) return flow.nodes.map((n) => n.id);

  const adjacency = new Map<string, string[]>();
  for (const edge of flow.edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  const visited = new Set<string>();
  const ordered: string[] = [];

  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    ordered.push(id);
    const nexts = adjacency.get(id) ?? [];
    for (const next of nexts) {
      visit(next);
    }
  };

  visit(entryId);

  for (const node of flow.nodes) {
    if (!visited.has(node.id)) {
      visit(node.id);
    }
  }

  return ordered;
}

function shortenNodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32);
}

export function migrateFlowToGemini(flow: FlowJson): MigrationResult {
  let persona = DEFAULT_PERSONA;
  const rules: string[] = [];
  const knowledge: string[] = [];
  const toolDefs: unknown[] = [];

  const nodeMap = new Map<string, ScenarioFlowNode>();
  for (const node of flow.nodes) {
    nodeMap.set(node.id, node);
  }

  const orderedIds = buildOrderedNodeIds(flow);

  for (const nodeId of orderedIds) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    switch (node.type) {
      case "speak": {
        rules.push(`「${node.data.text}」と案内する`);
        break;
      }

      case "listen": {
        const label = node.data.label ?? node.data.variableName;
        rules.push(`${label}を聞き取る`);
        break;
      }

      case "branch": {
        const d = node.data;
        if (d.method === "keyword") {
          const kwSummaries = d.branches
            .map((b) => `${b.keywords?.join("/")}→${b.label}`)
            .join("、");
          rules.push(
            `${d.inputVariable}に${kwSummaries}が含まれる場合は対応するフローに進む`,
          );
        } else {
          const labels = d.branches.map((b) => b.label).join("、");
          rules.push(
            `${d.inputVariable}の意図を判断し、${labels}のいずれかに分類`,
          );
        }
        break;
      }

      case "api_call": {
        const d = node.data;
        const params: Record<string, unknown> = {};
        for (const m of d.responseMapping) {
          params[m.variableName] = {
            type: "string",
            description: `JSONPath: ${m.jsonPath}`,
          };
        }
        toolDefs.push({
          name: shortenNodeId(node.id),
          description: d.url,
          parameters: {
            type: "object",
            properties: params,
          },
        });
        break;
      }

      case "ai_agent": {
        const d = node.data;
        persona = d.systemPrompt || persona;
        if (d.openingLine) {
          rules.push(`最初に「${d.openingLine}」と挨拶する`);
        }
        if (d.slots.length > 0) {
          const slotLines = d.slots
            .map(
              (s) =>
                `  - ${s.name}: ${s.description}${s.required ? "（必須）" : "（任意）"}`,
            )
            .join("\n");
          rules.push(`以下の情報を聞き取る:\n${slotLines}`);
        }
        break;
      }

      case "sms": {
        toolDefs.push({
          name: "send_sms",
          description: "SMSを送信する",
          parameters: {
            type: "object",
            properties: {
              to: { type: "string", description: "送信先電話番号" },
              body: { type: "string", description: "メッセージ本文" },
            },
            required: ["to", "body"],
          },
        });
        rules.push(`SMS送信: 宛先=${node.data.to}, 内容=${node.data.body}`);
        break;
      }

      case "transfer": {
        const d = node.data;
        rules.push(
          `転送条件: ${d.to}に転送（タイムアウト${d.timeout}秒）`,
        );
        break;
      }

      case "end": {
        const farewell = node.data.farewell;
        if (farewell) {
          rules.push(`終話時: ${farewell}`);
        } else {
          rules.push("終話時: 通話を終了する");
        }
        break;
      }

      case "dtmf": {
        const d = node.data;
        const branchDesc = d.branches
          .map((b) => `${b.digit}=${b.label}`)
          .join("、");
        rules.push(
          `プッシュボタン入力: ${d.promptText}（${branchDesc}）`,
        );
        break;
      }
    }
  }

  return {
    persona,
    conversationRules: rules.join("\n"),
    businessKnowledge: knowledge.length > 0 ? knowledge.join("\n") : "",
    guardRails: DEFAULT_GUARD_RAILS,
    toolDefinitions: toolDefs,
  };
}
