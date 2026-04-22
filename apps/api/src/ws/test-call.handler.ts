import type { WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import { GeminiLiveSession } from "../lib/gemini-live.js";
import {
  buildSystemInstruction,
  buildToolDeclarations,
} from "../services/prompt-builder.js";
import { dispatchToolCall } from "../services/tool-dispatcher.js";
import * as geminiRepo from "../repositories/gemini-scenario.repo.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

type ClientMessage =
  | { type: "start"; scenarioId: string; tenantId: string }
  | { type: "audio"; data: string }
  | { type: "stop" };

function safeSend(ws: WebSocket, data: unknown): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * ブラウザテスト通話ハンドラ。
 * Twilio を経由せず、ブラウザのマイクから直接音声を受け取る。
 */
export function handleTestCall(ws: WebSocket, _req: IncomingMessage): void {
  let gemini: GeminiLiveSession | null = null;

  ws.on("message", (raw: Buffer) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }

    if (msg.type === "start") {
      void handleStart(msg.scenarioId, msg.tenantId);
      return;
    }

    if (msg.type === "audio" && gemini) {
      const pcm16k = Buffer.from(msg.data, "base64");
      gemini.sendAudio(pcm16k);
      return;
    }

    if (msg.type === "stop") {
      gemini?.close();
      gemini = null;
      safeSend(ws, { type: "ended" });
      return;
    }
  });

  ws.on("close", () => {
    gemini?.close();
    gemini = null;
  });

  async function handleStart(
    scenarioId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      const gs = await geminiRepo.getByScenarioId(scenarioId);
      if (!gs) {
        safeSend(ws, {
          type: "error",
          message: "Gemini scenario not found",
        });
        return;
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      const systemInstruction = buildSystemInstruction({
        persona: gs.persona,
        conversationRules: gs.conversationRules,
        businessKnowledge: gs.businessKnowledge,
        guardRails: gs.guardRails,
        toolDefinitions: gs.toolDefinitions as unknown[],
        voiceName: gs.voiceName,
        languageCode: gs.languageCode,
        tenantName: tenant?.name ?? "",
        callerNumber: "test-call",
      });

      const tools = buildToolDeclarations(gs.toolDefinitions as unknown[]);

      gemini = new GeminiLiveSession();
      gemini.connect(
        {
          apiKey: process.env.GEMINI_API_KEY ?? "",
          model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash-live-001",
          systemInstruction,
          tools: [{ functionDeclarations: tools }],
          voice: gs.voiceName,
          languageCode: gs.languageCode,
        },
        {
          onAudio(pcm24kChunk) {
            safeSend(ws, {
              type: "audio",
              data: pcm24kChunk.toString("base64"),
            });
          },

          onTranscript(role, text) {
            safeSend(ws, { type: "transcript", role, text });
          },

          onToolCall(id, name, args) {
            safeSend(ws, { type: "tool_call", name, args });
            void (async () => {
              try {
                const result = await dispatchToolCall(
                  { id, name, args },
                  {
                    tenantId,
                    callSid: "test-call",
                    callerNumber: "test-call",
                    transferNumber: gs.transferNumber,
                    transferTimeout: gs.transferTimeout,
                  },
                );
                safeSend(ws, {
                  type: "tool_result",
                  name,
                  result: result.result,
                });
                gemini?.sendToolResult(id, result.result);
              } catch (err) {
                logger.error({ err, tool: name }, "test-call tool error");
                gemini?.sendToolResult(id, { error: String(err) });
              }
            })();
          },

          onTurnComplete() {
            /* noop */
          },

          onError(err) {
            logger.error({ err }, "test-call Gemini error");
            safeSend(ws, {
              type: "error",
              message: err.message,
            });
          },

          onClose() {
            gemini = null;
            safeSend(ws, { type: "ended" });
          },
        },
      );
    } catch (err) {
      logger.error({ err }, "test-call start failed");
      safeSend(ws, {
        type: "error",
        message: String(err),
      });
    }
  }
}
