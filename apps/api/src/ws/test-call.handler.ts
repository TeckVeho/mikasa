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

      // DB に未保存の場合はデフォルト値でテスト通話を開始
      const persona = gs?.persona ?? [
        "あなたは大手物流会社のコールセンターに10年勤務するベテラン電話オペレーター「佐藤」です。",
        "",
        "## 基本姿勢",
        "- 温かみがあり、落ち着いた声のトーンで話す",
        "- 早口にならず、一文を短く区切り、間（ま）を意識して話す",
        "- 「えーと」「あのー」などのフィラーは使わず、沈黙で間を取る",
        "- 敬語は丁寧語（です・ます）を基本とし、過度な謙譲語の連続で聞き取りにくくならないようにする",
        "- お客様の名前がわかったら「○○様」と呼びかけ、会話をパーソナライズする",
        "",
        "## 電話対応の原則",
        "- 推測や憶測で情報を伝えない。確認が必要な場合は「確認いたしますので少々お待ちください」と断る",
        "- お客様の発言を遮らない。最後まで聞いてから応答する",
        "- 一度に複数の質問をしない。一つずつ順番に確認する",
      ].join("\n");
      const conversationRules = gs?.conversationRules ?? [
        "### STEP 1: 「お電話ありがとうございます。○○運輸でございます。ご用件をお伺いいたします。」と挨拶する",
        "### STEP 2: お客様の用件を傾聴し、必要な情報を一つずつ確認する",
        "### STEP 3: 聞き取った内容を復唱して最終確認を得る",
        "### STEP 4: 手配・案内を行い、対応不可の場合はオペレーターに転送する",
        "### STEP 5: 「他にご不明な点はございますか？」と確認し、「お電話ありがとうございました。失礼いたします。」で締める",
      ].join("\n");
      const businessKnowledge = gs?.businessKnowledge ?? "";
      const guardRails = gs?.guardRails ?? "";
      const toolDefinitions = (gs?.toolDefinitions ?? []) as unknown[];
      const voiceName = gs?.voiceName ?? "Aoede";
      const languageCode = gs?.languageCode ?? "ja-JP";
      const transferNumber = gs?.transferNumber ?? null;
      const transferTimeout = gs?.transferTimeout ?? 30;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      const systemInstruction = buildSystemInstruction({
        persona,
        conversationRules,
        businessKnowledge,
        guardRails,
        toolDefinitions,
        voiceName,
        languageCode,
        tenantName: tenant?.name ?? "",
        callerNumber: "test-call",
      });

      const tools = buildToolDeclarations(toolDefinitions);

      gemini = new GeminiLiveSession();
      gemini.connect(
        {
          apiKey: process.env.GEMINI_API_KEY ?? "",
          model: process.env.GEMINI_MODEL ?? "models/gemini-3.1-flash-live-preview",
          systemInstruction,
          tools: [{ functionDeclarations: tools }],
          voice: voiceName,
          languageCode,
        },
        {
          onSetupComplete() {
            gemini?.sendInitialTurn();
          },

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
                    transferNumber,
                    transferTimeout,
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
            // エラー後は ended も送る（フロントが終了状態になるように）
            gemini = null;
            safeSend(ws, { type: "ended" });
          },

          onClose() {
            if (gemini !== null) {
              // エラーなしの正常終了のみ ended を送る（onError 後の二重送信を防ぐ）
              gemini = null;
              safeSend(ws, { type: "ended" });
            }
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
