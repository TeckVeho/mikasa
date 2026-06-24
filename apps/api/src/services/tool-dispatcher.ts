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
  /** 通話開始時に確定した通話ログ ID（register_callback の紐付け用） */
  callLogId: string;
  transferNumber: string | null;
  transferTimeout: number;
  toolDefinitions?: unknown[];
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
        return wrap(
          await handleCustomTool(
            request.args,
            request.name,
            context.toolDefinitions ?? [],
          ),
        );
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

function buildCallbackNote(args: Record<string, unknown>): string {
  const lines: string[] = [];
  const reason = args.reason != null ? String(args.reason).trim() : "";
  if (reason) lines.push(`用件: ${reason}`);

  const callerName =
    args.caller_name != null ? String(args.caller_name).trim() : "";
  if (callerName) lines.push(`お名前: ${callerName}`);

  const companyName =
    args.company_name != null ? String(args.company_name).trim() : "";
  if (companyName) lines.push(`会社名: ${companyName}`);

  const preferredTime =
    args.preferred_time != null ? String(args.preferred_time).trim() : "";
  if (preferredTime) lines.push(`希望時間帯: ${preferredTime}`);

  if (args.collected_info != null && typeof args.collected_info === "object") {
    lines.push(
      `その他: ${JSON.stringify(args.collected_info, null, 0)}`,
    );
  }

  return lines.join("\n");
}

async function handleRegisterCallback(
  args: Record<string, unknown>,
  context: ToolDispatchContext,
): Promise<unknown> {
  const callbackNumber =
    args.callback_number != null && String(args.callback_number).trim()
      ? String(args.callback_number).trim()
      : context.callerNumber;

  await prisma.callbackRequest.create({
    data: {
      id: newId(),
      tenantId: context.tenantId,
      callLogId: context.callLogId,
      callerNumber: callbackNumber,
      preferredTime: args.preferred_time != null ? String(args.preferred_time) : undefined,
      status: "pending",
      note: buildCallbackNote(args),
    },
  });

  logger.info(
    {
      tenantId: context.tenantId,
      callSid: context.callSid,
      callLogId: context.callLogId,
      callbackNumber,
      reason: args.reason,
    },
    "register_callback saved",
  );

  return {
    status: "registered",
    message: "折り返しリクエストを登録しました",
  };
}

function findToolDefinition(
  toolDefinitions: unknown[],
  toolName: string,
): Record<string, unknown> | undefined {
  const found = toolDefinitions.find(
    (tool) =>
      tool != null &&
      typeof tool === "object" &&
      (tool as { name?: string }).name === toolName,
  );
  return found != null && typeof found === "object"
    ? (found as Record<string, unknown>)
    : undefined;
}

async function handleCustomTool(
  args: Record<string, unknown>,
  toolName: string,
  toolDefinitions: unknown[],
): Promise<unknown> {
  const toolDef = findToolDefinition(toolDefinitions, toolName);

  const endpoint =
    typeof toolDef?._endpoint === "string"
      ? toolDef._endpoint
      : typeof args._endpoint === "string"
        ? args._endpoint
        : undefined;
  if (!endpoint) {
    return { error: "no endpoint configured" };
  }

  const method =
    typeof toolDef?._method === "string"
      ? toolDef._method.toUpperCase()
      : typeof args._method === "string"
        ? args._method.toUpperCase()
        : "POST";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const toolHeaders = toolDef?._headers ?? args._headers;
  if (toolHeaders && typeof toolHeaders === "object") {
    Object.assign(headers, toolHeaders as Record<string, string>);
  }

  const timeoutMs =
    typeof toolDef?._timeout === "number"
      ? toolDef._timeout
      : CUSTOM_TOOL_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const { _endpoint: _e, _method: _m, _headers: _h, ...payload } = args;

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
