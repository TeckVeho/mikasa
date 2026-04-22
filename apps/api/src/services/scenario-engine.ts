import type { CallSession } from "@logivoice/shared";
import type { FlowJson } from "@logivoice/shared";
import { agentConverse, classifyIntent } from "../lib/openai.js";
import { expandVariables } from "../utils/expand-variables.js";
import { sendSms } from "../lib/twilio.js";
import {
  findEntryNodeId,
  findNode,
  getBranchEdgeTarget,
  getNextFromEdge,
} from "./flow-graph.js";
import { JSONPath } from "jsonpath-plus";

export type EngineEffect =
  | { type: "speak"; text: string; speed: number }
  | { type: "listen" }
  | {
      type: "listen_dtmf";
      numDigits: number;
      timeoutSeconds: number;
      variableName: string;
    }
  | { type: "transfer"; to: string; timeout: number; onNoAnswerNodeId: string }
  | { type: "sms"; to: string; body: string }
  | { type: "end"; farewell?: string }
  | { type: "error_message"; text: string };

export type EngineEvent =
  | { type: "start" }
  | { type: "tts_done" }
  | { type: "utterance"; text: string }
  | { type: "dtmf_digit"; digit: string }
  | { type: "transfer_no_answer" };

export type EngineAdvanceResult =
  | { ok: true; session: CallSession; effects: EngineEffect[] }
  | { ok: false; error: string };

function mapJsonPath(obj: unknown, path: string): string {
  const r = JSONPath({
    path,
    json: obj as object,
    wrap: false,
  });
  const v = Array.isArray(r) ? r[0] : r;
  return v === undefined ? "" : String(v);
}

async function runApiCall(
  data: {
    url: string;
    method: "GET" | "POST" | "PUT";
    headers: Record<string, string>;
    body?: Record<string, unknown>;
    responseMapping: Array<{ jsonPath: string; variableName: string }>;
    timeoutMs: number;
  },
  variables: Record<string, string>,
): Promise<{ ok: true; vars: Record<string, string> } | { ok: false }> {
  const url = expandVariables(data.url, variables);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), data.timeoutMs);
  try {
    const body =
      data.body !== undefined
        ? JSON.parse(expandVariables(JSON.stringify(data.body), variables))
        : undefined;
    const res = await fetch(url, {
      method: data.method,
      headers: data.headers,
      body:
        data.method !== "GET" && body !== undefined
          ? JSON.stringify(body)
          : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false };
    }
    const json = (await res.json()) as unknown;
    const vars: Record<string, string> = {};
    for (const m of data.responseMapping) {
      vars[m.variableName] = mapJsonPath(json, m.jsonPath);
    }
    return { ok: true, vars };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}

/** Advance scenario state machine; may chain multiple auto nodes (speak/api/sms). */
export async function advanceScenario(
  session: CallSession,
  flow: FlowJson,
  event: EngineEvent,
): Promise<EngineAdvanceResult> {
  let s = { ...session };

  const emit: EngineEffect[] = [];

  const processNode = async (nodeId: string): Promise<EngineAdvanceResult> => {
    const node = findNode(flow, nodeId);
    if (!node) {
      return { ok: false, error: "invalid node" };
    }

    switch (node.type) {
      case "speak": {
        const text = expandVariables(node.data.text, s.variables);
        const speed = node.data.speed;
        emit.push({ type: "speak", text, speed });
        s = { ...s, currentNodeId: nodeId };
        return { ok: true, session: s, effects: emit };
      }
      case "listen": {
        s = { ...s, currentNodeId: nodeId, retryCount: 0 };
        emit.push({ type: "listen" });
        return { ok: true, session: s, effects: emit };
      }
      case "branch": {
        const d = node.data;
        const raw = s.variables[d.inputVariable] ?? "";
        let nextId: string | null = null;
        if (d.method === "keyword") {
          for (const b of d.branches) {
            if (b.keywords?.some((k) => raw.includes(k))) {
              nextId = getBranchEdgeTarget(flow, node.id, b.id);
              if (nextId) break;
            }
          }
          if (!nextId) nextId = d.defaultNextNodeId;
        } else {
          const labels = d.branches.map((b) => b.label);
          const cl = await classifyIntent({
            utterance: raw,
            labels,
            aiPrompt: d.aiPrompt,
          });
          if (!cl.ok) {
            nextId = d.defaultNextNodeId;
          } else {
            const matched = d.branches.find((b) => b.label === cl.data.label);
            nextId =
              (matched && getBranchEdgeTarget(flow, node.id, matched.id)) ||
              d.defaultNextNodeId;
          }
        }
        if (!nextId) return { ok: false, error: "branch dead end" };
        s = { ...s, currentNodeId: nextId };
        return processNode(nextId);
      }
      case "api_call": {
        const d = node.data;
        const res = await runApiCall(d, s.variables);
        const nextEdge = getNextFromEdge(flow, node.id);
        if (!res.ok) {
          const errTarget = getNextFromEdge(flow, node.id, "error");
          const target = errTarget ?? nextEdge;
          if (!target) return { ok: false, error: "api error no edge" };
          s = { ...s, currentNodeId: target };
          return processNode(target);
        }
        s = {
          ...s,
          variables: { ...s.variables, ...res.vars },
          currentNodeId: node.id,
        };
        if (!nextEdge) return { ok: false, error: "api ok but no next" };
        s = { ...s, currentNodeId: nextEdge };
        return processNode(nextEdge);
      }
      case "sms": {
        const to = expandVariables(node.data.to, s.variables);
        const body = expandVariables(node.data.body, s.variables);
        await sendSms(to, body);
        const next = getNextFromEdge(flow, node.id);
        if (!next) return { ok: false, error: "sms no next" };
        s = { ...s, currentNodeId: next };
        return processNode(next);
      }
      case "transfer": {
        const to = expandVariables(node.data.to, s.variables);
        emit.push({
          type: "transfer",
          to,
          timeout: node.data.timeout,
          onNoAnswerNodeId: node.data.onNoAnswer,
        });
        s = { ...s, currentNodeId: nodeId, status: "transferred" };
        return { ok: true, session: s, effects: emit };
      }
      case "end": {
        const farewell = node.data.farewell
          ? expandVariables(node.data.farewell, s.variables)
          : undefined;
        emit.push({ type: "end", farewell });
        s = { ...s, status: "ended", currentNodeId: nodeId };
        return { ok: true, session: s, effects: emit };
      }
      case "dtmf": {
        const d = node.data;
        const text = expandVariables(d.promptText, s.variables);
        const speed = d.speed;
        emit.push({ type: "speak", text, speed });
        s = { ...s, currentNodeId: nodeId };
        return { ok: true, session: s, effects: emit };
      }
      case "ai_agent": {
        const d = node.data;
        const r = await agentConverse({
          systemPrompt: d.systemPrompt,
          slots: d.slots,
          filledVariables: s.variables,
          conversationHistory: [],
          userUtterance: null,
          turn: 1,
          maxTurns: d.maxTurns,
        });
        if (!r.ok) {
          const fail = getNextFromEdge(flow, node.id, "failure");
          if (fail) {
            s = { ...s, currentNodeId: fail };
            return processNode(fail);
          }
          return { ok: false, error: "ai_agent open failed" };
        }
        let vars = { ...s.variables, ...r.data.extractedSlots };
        if (r.data.allComplete) {
          const next =
            getNextFromEdge(flow, node.id) ??
            getNextFromEdge(flow, node.id, "complete");
          if (!next) return { ok: false, error: "ai_agent complete no edge" };
          s = {
            ...s,
            variables: vars,
            currentNodeId: next,
            aiAgent: undefined,
          };
          return processNode(next);
        }
        if (r.data.shouldFail) {
          const fail = getNextFromEdge(flow, node.id, "failure");
          if (!fail) return { ok: false, error: "ai_agent failure no edge" };
          s = { ...s, variables: vars, aiAgent: undefined, currentNodeId: fail };
          return processNode(fail);
        }
        const speakText =
          d.openingLine?.trim() || r.data.assistantText;
        const now = Date.now();
        const hist = [
          ...(s.conversationHistory ?? []),
          {
            role: "assistant" as const,
            content: speakText,
            timestamp: now,
          },
        ];
        s = {
          ...s,
          variables: vars,
          conversationHistory: hist,
          aiAgent: { nodeId, turn: 1 },
          currentNodeId: nodeId,
        };
        emit.push({ type: "speak", text: speakText, speed: 1 });
        return { ok: true, session: s, effects: emit };
      }
      default:
        return { ok: false, error: "unknown node" };
    }
  };

  const processAiAgentAfterUtterance = async (
    userText: string,
  ): Promise<EngineAdvanceResult> => {
    const node = findNode(flow, s.currentNodeId);
    if (!node || node.type !== "ai_agent") {
      return { ok: false, error: "utterance unexpected" };
    }
    const d = node.data;
    const turn = (s.aiAgent?.turn ?? 1) + 1;
    const conv = (s.conversationHistory ?? []).map((m) => ({
      role: m.role as "system" | "assistant" | "user",
      content: m.content,
    }));
    const r = await agentConverse({
      systemPrompt: d.systemPrompt,
      slots: d.slots,
      filledVariables: s.variables,
      conversationHistory: conv,
      userUtterance: userText,
      turn,
      maxTurns: d.maxTurns,
    });
    if (!r.ok) {
      const fail = getNextFromEdge(flow, node.id, "failure");
      if (!fail) return { ok: false, error: "ai_agent step failed" };
      s = { ...s, aiAgent: undefined, currentNodeId: fail };
      return processNode(fail);
    }
    s = { ...s, variables: { ...s.variables, ...r.data.extractedSlots } };
    if (r.data.allComplete) {
      const next =
        getNextFromEdge(flow, node.id) ??
        getNextFromEdge(flow, node.id, "complete");
      if (!next) return { ok: false, error: "ai_agent complete no edge" };
      s = {
        ...s,
        aiAgent: undefined,
        currentNodeId: next,
      };
      return processNode(next);
    }
    if (r.data.shouldFail) {
      const fail = getNextFromEdge(flow, node.id, "failure");
      if (!fail) return { ok: false, error: "ai_agent failure no edge" };
      s = { ...s, aiAgent: undefined, currentNodeId: fail };
      return processNode(fail);
    }
    const now = Date.now();
    s = {
      ...s,
      conversationHistory: [
        ...(s.conversationHistory ?? []),
        { role: "user", content: userText, timestamp: now },
        {
          role: "assistant",
          content: r.data.assistantText,
          timestamp: now,
        },
      ],
      aiAgent: { nodeId: node.id, turn },
      currentNodeId: node.id,
    };
    const effects: EngineEffect[] = [
      { type: "speak", text: r.data.assistantText, speed: 1 },
    ];
    return { ok: true, session: s, effects };
  };

  if (event.type === "start") {
    const entry = findEntryNodeId(flow);
    if (!entry) return { ok: false, error: "no entry" };
    s = { ...s, currentNodeId: entry };
    return processNode(entry);
  }

  if (event.type === "tts_done") {
    const cur = findNode(flow, s.currentNodeId);
    if (cur?.type === "dtmf") {
      const d = cur.data;
      const effects: EngineEffect[] = [
        {
          type: "listen_dtmf",
          numDigits: d.numDigits,
          timeoutSeconds: d.timeoutSeconds,
          variableName: d.variableName,
        },
      ];
      s = { ...s, currentNodeId: cur.id };
      return { ok: true, session: s, effects };
    }
    if (cur?.type === "ai_agent") {
      const effects: EngineEffect[] = [{ type: "listen" }];
      s = { ...s, currentNodeId: cur.id };
      return { ok: true, session: s, effects };
    }
    if (!cur || cur.type !== "speak") {
      return { ok: false, error: "tts_done unexpected" };
    }
    const next = getNextFromEdge(flow, cur.id);
    if (!next) return { ok: false, error: "no edge after speak" };
    s = { ...s, currentNodeId: next };
    return processNode(next);
  }

  if (event.type === "utterance") {
    const cur = findNode(flow, s.currentNodeId);
    if (cur?.type === "ai_agent") {
      return processAiAgentAfterUtterance(event.text);
    }
    if (!cur || cur.type !== "listen") {
      return { ok: false, error: "utterance unexpected" };
    }
    const d = cur.data;
    s = {
      ...s,
      variables: { ...s.variables, [d.variableName]: event.text },
      currentNodeId: cur.id,
    };
    const next = getNextFromEdge(flow, cur.id);
    if (!next) return { ok: false, error: "no edge after listen" };
    s = { ...s, currentNodeId: next };
    return processNode(next);
  }

  if (event.type === "dtmf_digit") {
    const cur = findNode(flow, s.currentNodeId);
    if (!cur || cur.type !== "dtmf") {
      return { ok: false, error: "dtmf_digit unexpected" };
    }
    const d = cur.data;
    const digit = event.digit;
    s = {
      ...s,
      variables: { ...s.variables, [d.variableName]: digit },
      currentNodeId: cur.id,
    };
    let nextId: string | null = d.defaultNextNodeId;
    if (digit) {
      for (const b of d.branches) {
        if (b.digit === digit) {
          const t = getBranchEdgeTarget(flow, cur.id, b.id);
          if (t) {
            nextId = t;
            break;
          }
        }
      }
    }
    if (!nextId) return { ok: false, error: "dtmf no next" };
    s = { ...s, currentNodeId: nextId };
    return processNode(nextId);
  }

  if (event.type === "transfer_no_answer") {
    const cur = findNode(flow, s.currentNodeId);
    if (!cur || cur.type !== "transfer") {
      return { ok: false, error: "transfer_no_answer unexpected" };
    }
    const target = cur.data.onNoAnswer;
    s = { ...s, currentNodeId: target, status: "active" };
    return processNode(target);
  }

  return { ok: false, error: "unknown event" };
}
