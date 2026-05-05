import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";

export type ToolCallRequest = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export type ToolCallResult = {
  id: string;
  name: string;
  result: unknown;
};

export type ToolDispatchContext = {
  tenantId: string;
  callSid: string;
  callerNumber: string;
  transferNumber: string | null;
  transferTimeout: number;
};

const CUSTOM_TOOL_TIMEOUT_MS = 5_000;

export async function dispatchToolCall(
  request: ToolCallRequest,
  context: ToolDispatchContext,
): Promise<ToolCallResult> {
  const wrap = (result: unknown): ToolCallResult => ({
    id: request.id,
    name: request.name,
    result,
  });

  try {
    switch (request.name) {
      case "transfer_to_operator":
        return wrap(await handleTransfer(request.args, context));
      case "register_callback":
        return wrap(await handleRegisterCallback(request.args, context));
      default:
        return wrap(await handleCustomTool(request.args, request.name));
    }
  } catch (err) {
    logger.error({ err, tool: request.name }, "tool dispatch error");
    return wrap({ error: String(err) });
  }
}

async function handleTransfer(
  args: Record<string, unknown>,
  context: ToolDispatchContext,
): Promise<unknown> {
  await prisma.transferHandoff.create({
    data: {
      tenantId: context.tenantId,
      callSid: context.callSid,
      callerNumber: context.callerNumber,
      reason: String(args.reason ?? ""),
      collectedInfo: args.collected_info != null ? (args.collected_info as object) : undefined,
      priority: String(args.priority ?? "normal"),
      department: args.department != null ? String(args.department) : "general",
      status: "pending",
      handledNote: "",
    },
  });

  return { status: "transferring", reason: args.reason };
}

async function handleRegisterCallback(
  args: Record<string, unknown>,
  context: ToolDispatchContext,
): Promise<unknown> {
  await prisma.callbackRequest.create({
    data: {
      id: newId(),
      tenantId: context.tenantId,
      callerNumber: context.callerNumber,
      preferredTime: args.preferred_time != null ? String(args.preferred_time) : undefined,
      status: "pending",
      note: "",
    },
  });

  return {
    status: "registered",
    message: "折り返しリクエストを登録しました",
  };
}

async function handleCustomTool(
  args: Record<string, unknown>,
  toolName: string,
): Promise<unknown> {
  const endpoint = args._endpoint;
  if (typeof endpoint !== "string" || !endpoint) {
    return { error: "no endpoint configured" };
  }

  const method =
    typeof args._method === "string" ? args._method.toUpperCase() : "POST";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (args._headers && typeof args._headers === "object") {
    Object.assign(headers, args._headers);
  }

  const { _endpoint: _, _method: __, _headers: ___, ...payload } = args;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CUSTOM_TOOL_TIMEOUT_MS);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (method !== "GET") {
      fetchOptions.body = JSON.stringify(payload);
    }

    const res = await fetch(endpoint, fetchOptions);
    const json = (await res.json()) as unknown;

    logger.info(
      { tool: toolName, status: res.status },
      "custom tool response",
    );

    return json;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { error: "timeout" };
    }
    return { error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}
