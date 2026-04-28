import type { WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import { GeminiLiveSession } from "../lib/gemini-live.js";
import {
  buildSystemInstruction,
  buildToolDeclarations,
} from "../services/prompt-builder.js";
import { dispatchToolCall } from "../services/tool-dispatcher.js";
import * as geminiRepo from "../repositories/gemini-scenario.repo.js";
import * as callRepo from "../repositories/call-log.repo.js";
import { publishCallCompleted } from "../lib/pubsub.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { newId } from "../utils/id.js";
import { verifyAuthToken } from "../services/auth.service.js";

type ClientMessage =
  | { type: "start"; scenarioId: string }
  | { type: "audio"; data: string }
  | { type: "stop" };

function safeSend(ws: WebSocket, data: unknown): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

type TestSessionState = {
  startedAt: number;
  tenantId: string;
  scenarioId: string;
  phoneNumberId: string;
  twilioCallSid: string;
  transcript: string;
};

async function resolveTestCallTenantId(
  req: IncomingMessage,
): Promise<{ ok: true; tenantId: string } | { ok: false; error: string }> {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "", `http://${host}`);
  const token = url.searchParams.get("token");
  const devTenant = url.searchParams.get("dev_tenant_id");
  const devUserId = url.searchParams.get("dev_user_id") ?? "dev-user";

  if (process.env.NODE_ENV !== "production" && devTenant) {
    const user = await prisma.user.findUnique({ where: { id: devUserId } });
    if (!user || user.tenantId !== devTenant) {
      return {
        ok: false,
        error: "開発用 X-Dev-User-Id とテナントの組み合わせが無効です",
      };
    }
    return { ok: true, tenantId: user.tenantId };
  }

  if (!token) {
    return { ok: false, error: "認証トークンが必要です（URL に token= を付与）" };
  }

  const r = await verifyAuthToken(token);
  if (!r.ok) {
    return {
      ok: false,
      error: r.error ?? "認証に失敗しました",
    };
  }
  return { ok: true, tenantId: r.data.tenantId };
}

/**
 * ブラウザテスト通話ハンドラ。
 * Twilio を経由せず、ブラウザのマイクから直接音声を受け取る。
 * 認証: `?token=`（Firebase ID）または開発時のみ `?dev_tenant_id=&dev_user_id=`
 * 接続後サーバーが `{ type: "ready" }` を送り、クライアントが `{ type: "start", scenarioId }` を返す。
 */
export function handleTestCall(ws: WebSocket, req: IncomingMessage): void {
  void (async () => {
    const auth = await resolveTestCallTenantId(req);
    if (!auth.ok) {
      safeSend(ws, { type: "error", message: auth.error });
      ws.close();
      return;
    }
    const tenantId = auth.tenantId;
    safeSend(ws, { type: "ready" });

    let gemini: GeminiLiveSession | null = null;
    let testSession: TestSessionState | null = null;
    let finalized = false;

    async function finalizeTestCall(): Promise<void> {
      if (finalized || !testSession) return;
      finalized = true;
      const s = testSession;
      testSession = null;
      const id = newId();
      const transcriptText = s.transcript.trim() || null;
      try {
        await callRepo.upsertCallLogByTwilioSid({
          id,
          tenantId: s.tenantId,
          phoneNumberId: s.phoneNumberId,
          scenarioId: s.scenarioId,
          twilioCallSid: s.twilioCallSid,
          callerNumber: "音声テスト",
          status: "complete",
          transcriptText,
          durationSeconds: Math.max(
            0,
            Math.round((Date.now() - s.startedAt) / 1000),
          ),
          structuredData: { source: "scenario_voice_test" },
        });
        await publishCallCompleted({
          tenantId: s.tenantId,
          callLogId: id,
        });
      } catch (err) {
        logger.error(
          { err, twilioCallSid: s.twilioCallSid },
          "test-call finalize failed",
        );
      }
    }

    async function handleStart(scenarioId: string): Promise<void> {
      try {
        const scenario = await prisma.scenario.findFirst({
          where: { id: scenarioId, tenantId },
        });
        if (!scenario) {
          safeSend(ws, {
            type: "error",
            message: "このテナントに属するシナリオが見つかりません",
          });
          return;
        }

        const gs = await geminiRepo.getByScenarioIdForTenant(
          scenarioId,
          tenantId,
        );

        const persona = gs?.persona ?? [
          "あなたは大手物流会社のコールセンターに10年きんむするベテランでんわオペレーター「さとう」です。",
          "",
          "## 基本姿勢",
          "- 温かみがあり、落ち着いた声のトーンで話す",
          "- はやくちにならず、一文を短く区切り、ま を意識して話す",
          "- 「えーと」「あのー」などのフィラーは使わず、ちんもくで ま を取る",
          "- けいごはていねい語（です・ます）を基本とし、過度なけんじょう語の連続で聞き取りにくくならないようにする",
          "- おきゃくさまの名前がわかったら「○○さま」と呼びかけ、かいわをパーソナライズする",
          "",
          "## でんわ対応のげんそく",
          "- すいそくやおくそくで情報を伝えない。確認がひつような場合は「確認いたしますのでしょうしょうおまちください」と断る",
          "- おきゃくさまのはつげんをさえぎらない。最後まで聞いてからおうとうする",
          "- いちどにふくすうのしつもんをしない。ひとつずつじゅんばんに確認する",
        ].join("\n");
        const conversationRules = gs?.conversationRules ?? [
          "### STEP 1: 「おでんわありがとうございます。○○うんゆでございます。ごようけんをおうかがいいたします。」とあいさつする",
          "### STEP 2: おきゃくさまのようけんをけいちょうし、ひつような情報をひとつずつ確認する",
          "### STEP 3: 聞き取った内容をふくしょうしてさいしゅう確認を得る",
          "### STEP 4: てはい・あんないを行い、対応不可の場合はオペレーターにてんそうする",
          "### STEP 5: 「ほかにございますか？」と確認し、「おでんわありがとうございました。」で締める",
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

        const phoneForScenario = await prisma.phoneNumber.findFirst({
          where: { tenantId, scenarioId },
          select: { id: true },
        });
        const phoneFallback = await prisma.phoneNumber.findFirst({
          where: { tenantId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        const phoneNumberId = phoneForScenario?.id ?? phoneFallback?.id;
        if (!phoneNumberId) {
          safeSend(ws, {
            type: "error",
            message:
              "テスト通話の記録にはテナントに電話番号を1件以上登録してください。",
          });
          return;
        }

        const twilioCallSid = `tctest${newId()}`;
        testSession = {
          startedAt: Date.now(),
          tenantId,
          scenarioId,
          phoneNumberId,
          twilioCallSid,
          transcript: "",
        };

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
            model:
              process.env.GEMINI_MODEL ?? "models/gemini-3.1-flash-live-preview",
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
              if (text && testSession) {
                const prefix = role === "user" ? "お客様: " : "AI: ";
                testSession.transcript += prefix + text + "\n";
              }
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
              void finalizeTestCall();
              gemini = null;
              safeSend(ws, { type: "ended" });
            },

            onClose() {
              if (gemini !== null) {
                gemini = null;
                safeSend(ws, { type: "ended" });
              }
              void finalizeTestCall();
            },
          },
        );
      } catch (err) {
        testSession = null;
        logger.error({ err }, "test-call start failed");
        safeSend(ws, {
          type: "error",
          message: String(err),
        });
      }
    }

    ws.on("message", (raw: Buffer) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        return;
      }

      if (msg.type === "start") {
        if (!msg.scenarioId) return;
        void handleStart(msg.scenarioId);
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
        void finalizeTestCall();
        safeSend(ws, { type: "ended" });
        return;
      }
    });

    ws.on("close", () => {
      gemini?.close();
      gemini = null;
      void finalizeTestCall();
    });
  })();
}
