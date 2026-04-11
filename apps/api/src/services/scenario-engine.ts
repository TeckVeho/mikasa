import type { CallSession } from "@logivoice/shared";
import type { FlowJson } from "@logivoice/shared";
import { classifyIntent } from "../lib/openai.js";
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
  | { type: "transfer"; to: string; timeout: number; onNoAnswerNodeId: string }
  | { type: "sms"; to: string; body: string }
  | { type: "end"; farewell?: string }
  | { type: "error_message"; text: string };

export type EngineEvent =
  | { type: "start" }
  | { type: "tts_done" }
  | { type: "utterance"; text: string }
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
      default:
        return { ok: false, error: "unknown node" };
    }
  };

  if (event.type === "start") {
    const entry = findEntryNodeId(flow);
    if (!entry) return { ok: false, error: "no entry" };
    s = { ...s, currentNodeId: entry };
    return processNode(entry);
  }

  if (event.type === "tts_done") {
    const cur = findNode(flow, s.currentNodeId);
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
