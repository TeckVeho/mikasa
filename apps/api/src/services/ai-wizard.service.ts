import OpenAI from "openai";
import { type Result, flowJsonSchema } from "@logivoice/shared";
import { withRetry } from "../lib/with-retry.js";

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export type FlowWizardResult = {
  suggestedName: string;
  flowJson: unknown;
};

export type FlowWizardResponse = {
  reply: string;
  partialResult: FlowWizardResult | null;
  isComplete: boolean;
};

/* ------------------------------------------------------------------ */
/*  Flow-design intermediate types (AI output)                         */
/* ------------------------------------------------------------------ */

type FlowStep = {
  type: string;
  text?: string;
  speed?: number;
  farewell?: string;
  variableName?: string;
  label?: string;
  timeoutSeconds?: number;
  method?: string;
  inputVariable?: string;
  branches?: Array<{
    label: string;
    steps: FlowStep[];
    keywords?: string[];
  }>;
  promptText?: string;
  dtmfBranches?: Array<{ digit: string; label: string; steps: FlowStep[] }>;
  to?: string;
  body?: string;
  timeout?: number;
  systemPrompt?: string;
  openingLine?: string;
  slots?: Array<{
    name: string;
    description: string;
    required?: boolean;
    variableName: string;
  }>;
  maxTurns?: number;
  url?: string;
  httpMethod?: string;
};

type FlowDesign = {
  suggestedName: string;
  steps: FlowStep[];
};

/* ------------------------------------------------------------------ */
/*  System prompt                                                      */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `あなたは電話応対シナリオのフロー設計アシスタントです。
ユーザーとの対話を通じて、通話フローを設計してください。

## 使えるステップの種類
1. speak — メッセージ読み上げ。属性: text(必須), speed(省略可,デフォルト1)
2. listen — 音声聞き取り。属性: variableName(必須), label(省略可), timeoutSeconds(省略可,デフォルト7)
3. branch — AI分岐/キーワード分岐。属性: method("ai"|"keyword",必須), inputVariable(必須), branches(配列,各要素に label と steps)
4. dtmf — プッシュボタン入力。属性: promptText(必須), dtmfBranches(配列,各要素に digit, label, steps)
5. api_call — 外部API呼び出し。属性: url(必須), httpMethod("GET"|"POST"|"PUT")
6. sms — SMS送信。属性: to(必須), body(必須)
7. transfer — オペレーター転送。属性: to(電話番号)
8. end — 通話終了。属性: farewell(省略可)
9. ai_agent — AIスロット埋め対話。属性: systemPrompt, openingLine, slots(配列: name, description, required, variableName), maxTurns

## 対話の進め方
1. 最初に「どのような電話対応のフローを作りたいですか？」と質問
2. 業種・用途・聞き取り項目を確認
3. 通話の流れ（挨拶→聞き取り→分岐→対応→終了）を質問
4. 十分な情報が揃ったら flowDesign を生成して確認を促す
5. ユーザーが承認したら isComplete: true にする

## 重要なルール
- 1回の質問は2〜3個まで
- flowDesign は対話が十分進んでから生成する（最初の数ターンは null でよい）
- branch の steps は入れ子で分岐先のフローを表現する
- 対話が5ターン以上続いたらフロー案を提示する
- 変数名は snake_case の英語にする（例: customer_name, tracking_number）

## 出力形式
必ず以下のJSON形式のみを返す:
{
  "reply": "ユーザーに表示するメッセージ",
  "flowDesign": null または {
    "suggestedName": "シナリオ名",
    "steps": [
      { "type": "speak", "text": "お電話ありがとうございます。" },
      { "type": "listen", "variableName": "purpose", "label": "用件" },
      { "type": "branch", "method": "ai", "inputVariable": "purpose", "branches": [
        { "label": "再配達", "steps": [
          { "type": "listen", "variableName": "tracking_number", "label": "伝票番号" },
          { "type": "speak", "text": "再配達を手配いたします。" }
        ]},
        { "label": "その他", "steps": [
          { "type": "transfer", "to": "" }
        ]}
      ]},
      { "type": "end", "farewell": "お電話ありがとうございました。" }
    ]
  },
  "isComplete": false
}`;

const MAX_CONVERSATION_MESSAGES = 20;

/* ------------------------------------------------------------------ */
/*  Gemini API types                                                   */
/* ------------------------------------------------------------------ */

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

/* ------------------------------------------------------------------ */
/*  flowDesign → FlowJson converter                                    */
/* ------------------------------------------------------------------ */

type NodeOut = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
};
type EdgeOut = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

const NODE_GAP_Y = 160;
const BRANCH_GAP_X = 320;

function buildFlowJson(design: FlowDesign): { nodes: NodeOut[]; edges: EdgeOut[] } {
  const nodes: NodeOut[] = [];
  const edges: EdgeOut[] = [];
  let counter = 0;
  let edgeCounter = 0;

  function nextId(): string {
    counter += 1;
    return `n${counter}`;
  }
  function nextEdgeId(): string {
    edgeCounter += 1;
    return `e${edgeCounter}`;
  }

  function processSteps(
    steps: FlowStep[],
    startX: number,
    startY: number,
    connectFromId: string | null,
    connectHandle: string | null,
  ): { lastNodeId: string | null; endY: number } {
    let currentY = startY;
    let prevId = connectFromId;
    let prevHandle = connectHandle;

    for (const step of steps) {
      const nodeId = nextId();
      const data = buildNodeData(step, nodeId);

      nodes.push({
        id: nodeId,
        type: data._type as string,
        data: stripInternal(data),
        position: { x: startX, y: currentY },
      });

      if (prevId) {
        edges.push({
          id: nextEdgeId(),
          source: prevId,
          target: nodeId,
          sourceHandle: prevHandle ?? null,
        });
      }

      if (step.type === "branch" && step.branches?.length) {
        const branchCount = step.branches.length;
        const totalWidth = (branchCount - 1) * BRANCH_GAP_X;
        let branchX = startX - totalWidth / 2;
        const branchStartY = currentY + NODE_GAP_Y;
        let maxEndY = branchStartY;

        for (const branch of step.branches) {
          const branchId = (data as Record<string, unknown>)[`_branchId_${branch.label}`] as string | undefined;
          const handle = branchId ?? null;

          if (branch.steps.length > 0) {
            const sub = processSteps(branch.steps, branchX, branchStartY, nodeId, handle);
            if (sub.endY > maxEndY) maxEndY = sub.endY;
          }
          branchX += BRANCH_GAP_X;
        }

        currentY = maxEndY + NODE_GAP_Y;
        prevId = null;
        prevHandle = null;
        continue;
      }

      if (step.type === "dtmf" && step.dtmfBranches?.length) {
        const branchCount = step.dtmfBranches.length;
        const totalWidth = (branchCount - 1) * BRANCH_GAP_X;
        let branchX = startX - totalWidth / 2;
        const branchStartY = currentY + NODE_GAP_Y;
        let maxEndY = branchStartY;

        for (const db of step.dtmfBranches) {
          const handle = `branch:${db.digit}`;
          if (db.steps.length > 0) {
            const sub = processSteps(db.steps, branchX, branchStartY, nodeId, handle);
            if (sub.endY > maxEndY) maxEndY = sub.endY;
          }
          branchX += BRANCH_GAP_X;
        }

        currentY = maxEndY + NODE_GAP_Y;
        prevId = null;
        prevHandle = null;
        continue;
      }

      currentY += NODE_GAP_Y;
      prevId = nodeId;
      prevHandle = null;
    }

    return { lastNodeId: prevId, endY: currentY };
  }

  function buildNodeData(step: FlowStep, _nodeId: string): Record<string, unknown> {
    switch (step.type) {
      case "speak":
        return { _type: "speak", text: step.text ?? "", speed: step.speed ?? 1 };

      case "listen":
        return {
          _type: "listen",
          variableName: step.variableName ?? "field",
          label: step.label,
          timeoutSeconds: step.timeoutSeconds ?? 7,
          retryCount: 2,
          retryText: "もう一度お話しください。",
          excludeNumbers: false,
          noRetryOnFail: false,
          kanaConversion: "none",
        };

      case "branch": {
        const branches = (step.branches ?? []).map((b, i) => {
          const id = `b${counter}_${i}`;
          return { id, label: b.label, keywords: b.keywords };
        });
        const result: Record<string, unknown> = {
          _type: "branch",
          method: step.method ?? "ai",
          branches,
          defaultNextNodeId: "",
          inputVariable: step.inputVariable ?? "purpose",
        };
        (step.branches ?? []).forEach((b, i) => {
          result[`_branchId_${b.label}`] = branches[i].id;
        });
        return result;
      }

      case "dtmf": {
        const dtmfBranches = (step.dtmfBranches ?? []).map((db) => ({
          id: `db${counter}_${db.digit}`,
          digit: db.digit,
          label: db.label,
        }));
        return {
          _type: "dtmf",
          promptText: step.promptText ?? "",
          variableName: "dtmf_digit",
          numDigits: 1,
          timeoutSeconds: 7,
          speed: 1,
          branches: dtmfBranches,
          defaultNextNodeId: "",
        };
      }

      case "api_call":
        return {
          _type: "api_call",
          url: step.url ?? "https://example.com",
          method: step.httpMethod ?? "GET",
          headers: {},
          responseMapping: [],
          timeoutMs: 5000,
        };

      case "sms":
        return {
          _type: "sms",
          to: step.to ?? "{{caller_number}}",
          body: step.body ?? "",
        };

      case "transfer":
        return {
          _type: "transfer",
          to: step.to ?? "",
          timeout: step.timeout ?? 30,
          onNoAnswer: "",
        };

      case "end":
        return { _type: "end", farewell: step.farewell ?? "お電話ありがとうございました。" };

      case "ai_agent":
        return {
          _type: "ai_agent",
          systemPrompt: step.systemPrompt ?? "",
          openingLine: step.openingLine,
          slots: (step.slots ?? []).map((s) => ({
            name: s.name,
            description: s.description,
            required: s.required ?? true,
            variableName: s.variableName,
          })),
          maxTurns: step.maxTurns ?? 10,
        };

      default:
        return { _type: "speak", text: step.text ?? "" };
    }
  }

  function stripInternal(data: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!k.startsWith("_")) out[k] = v;
    }
    return out;
  }

  processSteps(design.steps, 250, 50, null, null);
  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/*  LLM: shared parse + OpenAI / Gemini                                 */
/* ------------------------------------------------------------------ */

function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, timeout: 30000 });
}

function parseLlmJsonToResponse(text: string): Result<FlowWizardResponse> {
  try {
    const parsed = JSON.parse(text) as {
      reply?: string;
      flowDesign?: FlowDesign | null;
      isComplete?: boolean;
    };

    let partialResult: FlowWizardResult | null = null;

    if (parsed.flowDesign?.steps?.length) {
      const raw = buildFlowJson(parsed.flowDesign);
      const validated = flowJsonSchema.safeParse(raw);

      if (validated.success) {
        partialResult = {
          suggestedName: parsed.flowDesign.suggestedName || "新規シナリオ",
          flowJson: validated.data,
        };
      } else {
        partialResult = {
          suggestedName: parsed.flowDesign.suggestedName || "新規シナリオ",
          flowJson: raw,
        };
      }
    }

    return {
      ok: true,
      data: {
        reply: parsed.reply ?? "",
        partialResult,
        isComplete: Boolean(parsed.isComplete) && partialResult !== null,
      },
    };
  } catch {
    return { ok: false, error: "wizard json parse error", code: "LLM_ERROR" };
  }
}

type ChatBody = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

async function callOpenAI(
  body: ChatBody,
): Promise<Result<FlowWizardResponse>> {
  const client = getOpenAIClient();
  if (!client) {
    return { ok: false, error: "OpenAI not configured (OPENAI_API_KEY)", code: "OPENAI_ERROR" };
  }

  const conversationMessages = body.messages.slice(-MAX_CONVERSATION_MESSAGES);
  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
  if (openaiMessages.length === 1) {
    openaiMessages.push({ role: "user", content: "シナリオ作成を始めてください。" });
  }

  const model = process.env.OPENAI_WIZARD_MODEL ?? "gpt-4o-mini";

  const wrapped = await withRetry(async () =>
    client.chat.completions.create({
      model,
      messages: openaiMessages,
      max_tokens: 4000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  );

  if (!wrapped.ok) {
    return { ok: false, error: wrapped.message, code: "OPENAI_ERROR" };
  }

  const text = wrapped.data.choices[0]?.message?.content;
  if (!text) {
    return { ok: false, error: "empty response from OpenAI", code: "OPENAI_ERROR" };
  }
  return parseLlmJsonToResponse(text);
}

/** 429/503 はリトライせず。それ以外は withRetry 相当は OpenAI 側に任せ、Geminiは1回+簡易リトライ */
async function callGeminiOnce(
  body: ChatBody,
): Promise<Result<FlowWizardResponse> | { rateLimited: true; message: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Gemini API not configured", code: "GEMINI_ERROR" };
  }

  const conversationMessages = body.messages.slice(-MAX_CONVERSATION_MESSAGES);

  const contents: GeminiContent[] = conversationMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "シナリオ作成を始めてください。" }] });
  }

  const model = process.env.GEMINI_MODEL_TEXT ?? "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
    }),
  });

  if (res.status === 429) {
    const t = await res.text();
    return { rateLimited: true, message: t.length > 500 ? t.slice(0, 500) : t };
  }
  if (res.status === 503) {
    return { rateLimited: true, message: "Gemini 503" };
  }

  if (!res.ok) {
    return { ok: false, error: `Gemini API HTTP ${res.status}: ${await res.text()}`, code: "GEMINI_ERROR" };
  }

  const geminiRes = (await res.json()) as GeminiResponse;
  if (geminiRes.error) {
    const msg = geminiRes.error.message ?? "Gemini error";
    if (/resource exhausted|rate limit|429|quota/i.test(msg)) {
      return { rateLimited: true, message: msg };
    }
    return { ok: false, error: msg, code: "GEMINI_ERROR" };
  }

  const text = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { ok: false, error: "empty response from Gemini", code: "GEMINI_ERROR" };
  }

  return parseLlmJsonToResponse(text);
}

/* ------------------------------------------------------------------ */
/*  Main chat handler                                                  */
/* ------------------------------------------------------------------ */

/**
 * SCENARIO_WIZARD_LLM: `auto` | `gemini` | `openai`
 * - auto: Gemini を試し、429/クォータ時は OPENAI_API_KEY あれば OpenAI にフォールバック
 * - gemini: Gemini のみ
 * - openai: OpenAI のみ
 */
export async function chat(
  _tenantId: string,
  body: ChatBody,
): Promise<Result<FlowWizardResponse>> {
  const mode = (process.env.SCENARIO_WIZARD_LLM ?? "auto").toLowerCase();
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (mode === "openai") {
    return callOpenAI(body);
  }

  if (mode === "gemini") {
    if (!hasGemini) {
      return { ok: false, error: "GEMINI_API_KEY not set", code: "GEMINI_ERROR" };
    }
    const g = await callGeminiOnce(body);
    if ("rateLimited" in g) {
      return {
        ok: false,
        error:
          "Gemini のクォータに達しています。SCENARIO_WIZARD_LLM=openai または .env に OPENAI_API_KEY を追加して auto でフォールバックできます。",
        code: "GEMINI_ERROR",
      };
    }
    return g;
  }

  if (hasGemini) {
    const g = await callGeminiOnce(body);
    if ("rateLimited" in g) {
      if (hasOpenAI) return callOpenAI(body);
      return {
        ok: false,
        error:
          "Gemini の無料枠の上限に達しています。.env に OPENAI_API_KEY を追加するか、Google AI Studio で課金を有効にしてください。",
        code: "LLM_ERROR",
      };
    }
    return g;
  }

  if (hasOpenAI) {
    return callOpenAI(body);
  }

  return {
    ok: false,
    error: "LLM 未設定: GEMINI_API_KEY または OPENAI_API_KEY を設定してください。",
    code: "LLM_ERROR",
  };
}
