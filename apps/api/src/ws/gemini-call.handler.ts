import type { WebSocket } from "ws";
import type { CallSession } from "@logivoice/shared";
import twilio from "twilio";
import { GeminiLiveSession } from "../lib/gemini-live.js";
import {
  buildSystemInstruction,
  buildToolDeclarations,
} from "../services/prompt-builder.js";
import {
  dispatchToolCall,
  type ToolDispatchContext,
} from "../services/tool-dispatcher.js";
import { cacheTransferInfo } from "../services/call-transfer.js";
import {
  mulawBase64ToPcm16Buffer,
  pcm16ToMulawBuffer,
  mulawBuffersToPcm16Buffer,
  pcm16ToWavBuffer,
} from "../utils/audio.js";
import { resample8kTo16k, resample24kTo8k } from "../utils/resample.js";
import { uploadCallRecording } from "../lib/storage.js";
import { newId } from "../utils/id.js";
import * as callRepo from "../repositories/call-log.repo.js";
import { publishCallCompleted } from "../lib/pubsub.js";
import { logger } from "../lib/logger.js";

type TwilioMediaMessage = {
  event: string;
  media?: { payload: string };
  stop?: { callSid: string };
};

/**
 * Gemini Live モードの通話を処理する。
 * call-stream.handler.ts から voiceEngine === "gemini_live" の場合に呼ばれる。
 */
export async function handleGeminiLiveCall(
  ws: WebSocket,
  streamSid: string,
  callSid: string,
  session: CallSession,
  geminiScenario: {
    persona: string;
    conversationRules: string;
    businessKnowledge: string;
    guardRails: string;
    toolDefinitions: unknown[];
    voiceName: string;
    languageCode: string;
    transferEnabled: boolean;
    transferNumber: string | null;
    transferTimeout: number;
  },
  tenantName: string,
): Promise<void> {
  const recordingMulawChunks: Buffer[] = [];
  let accumulatedTranscript = "";
  let finalized = false;

  const gemini = new GeminiLiveSession();

  const systemInstruction = buildSystemInstruction({
    persona: geminiScenario.persona,
    conversationRules: geminiScenario.conversationRules,
    businessKnowledge: geminiScenario.businessKnowledge,
    guardRails: geminiScenario.guardRails,
    toolDefinitions: geminiScenario.toolDefinitions,
    voiceName: geminiScenario.voiceName,
    languageCode: geminiScenario.languageCode,
    tenantName,
    callerNumber: session.variables.caller_number ?? "",
  });

  const tools = buildToolDeclarations(geminiScenario.toolDefinitions);

  const toolContext: ToolDispatchContext = {
    tenantId: session.tenantId,
    callSid,
    callerNumber: session.variables.caller_number ?? "",
    transferNumber: geminiScenario.transferNumber,
    transferTimeout: geminiScenario.transferTimeout,
  };

  async function finalize(status: string): Promise<void> {
    if (finalized) return;
    finalized = true;

    gemini.close();

    const id = newId();
    let audioStoragePath: string | null = null;
    if (recordingMulawChunks.length > 0) {
      const pcm = mulawBuffersToPcm16Buffer(recordingMulawChunks);
      const wav = pcm16ToWavBuffer(pcm, 8000);
      audioStoragePath = await uploadCallRecording(
        session.tenantId,
        id,
        wav,
      );
    }

    const transcriptText = accumulatedTranscript.trim() || null;
    await callRepo.upsertCallLogByTwilioSid({
      id,
      tenantId: session.tenantId,
      phoneNumberId: session.phoneNumberId,
      scenarioId: session.scenarioId,
      twilioCallSid: callSid,
      callerNumber: session.variables.caller_number ?? "unknown",
      status,
      transcriptText,
      durationSeconds: Math.round((Date.now() - session.startedAt) / 1000),
      audioStoragePath,
    });

    await publishCallCompleted({
      tenantId: session.tenantId,
      callLogId: id,
    });
  }

  async function executeTransfer(sid: string, transferNumber: string): Promise<void> {
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
    const transferUrl = `${process.env.API_PUBLIC_URL}/webhooks/twilio/transfer?to=${encodeURIComponent(transferNumber)}`;
    await twilioClient.calls(sid).update({
      url: transferUrl,
      method: "POST",
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Gemini → Twilio audio bridge                                      */
  /* ------------------------------------------------------------------ */
  gemini.connect(
    {
      apiKey: process.env.GEMINI_API_KEY ?? "",
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash-live-001",
      systemInstruction,
      tools: [{ functionDeclarations: tools }],
      voice: geminiScenario.voiceName,
      languageCode: geminiScenario.languageCode,
    },
    {
      onAudio(pcm24kChunk) {
        const pcm8k = resample24kTo8k(pcm24kChunk);
        const mulaw = pcm16ToMulawBuffer(pcm8k);
        sendAudioToTwilio(ws, streamSid, mulaw);
      },

      onTranscript(role, text) {
        if (text) {
          const prefix = role === "user" ? "お客様: " : "AI: ";
          accumulatedTranscript += prefix + text + "\n";
        }
      },

      onToolCall(id, name, args) {
        void (async () => {
          try {
            const result = await dispatchToolCall(
              { id, name, args },
              toolContext,
            );
            gemini.sendToolResult(id, result.result);

            if (name === "transfer_to_operator") {
              if (
                geminiScenario.transferEnabled &&
                geminiScenario.transferNumber
              ) {
                await cacheTransferInfo(callSid, {
                  transferNumber: geminiScenario.transferNumber,
                  callerNumber: session.variables.caller_number ?? "",
                  timeout: geminiScenario.transferTimeout,
                  reason: String(args.reason ?? ""),
                });
                setTimeout(() => {
                  void (async () => {
                    try {
                      await executeTransfer(
                        callSid,
                        geminiScenario.transferNumber!,
                      );
                      await finalize("transferred");
                    } catch (err) {
                      logger.error({ err }, "transfer execution failed");
                    }
                  })();
                }, 1000);
              }
            }
          } catch (err) {
            logger.error({ err, tool: name }, "tool call failed");
            gemini.sendToolResult(id, { error: String(err) });
          }
        })();
      },

      onTurnComplete() {
        /* noop – audio stream continues */
      },

      onError(err) {
        logger.error({ err }, "Gemini Live session error");
        void (async () => {
          try {
            if (
              geminiScenario.transferEnabled &&
              geminiScenario.transferNumber
            ) {
              await executeTransfer(callSid, geminiScenario.transferNumber);
              await finalize("transferred");
            } else {
              await finalize("error");
              ws.close();
            }
          } catch (transferErr) {
            logger.error({ err: transferErr }, "fallback transfer failed");
            ws.close();
          }
        })();
      },

      onClose() {
        void finalize("complete");
      },
    },
  );

  /* ------------------------------------------------------------------ */
  /*  Twilio → Gemini audio bridge                                      */
  /* ------------------------------------------------------------------ */
  ws.on("message", (raw: Buffer) => {
    let msg: TwilioMediaMessage;
    try {
      msg = JSON.parse(raw.toString()) as TwilioMediaMessage;
    } catch {
      return;
    }

    if (msg.event === "media" && msg.media) {
      recordingMulawChunks.push(Buffer.from(msg.media.payload, "base64"));

      const pcm8k = mulawBase64ToPcm16Buffer(msg.media.payload);
      const pcm16k = resample8kTo16k(pcm8k);
      gemini.sendAudio(pcm16k);
      return;
    }

    if (msg.event === "stop") {
      void finalize("complete");
    }
  });

  ws.on("close", () => {
    void finalize("complete");
  });
}

/* ------------------------------------------------------------------ */
/*  Twilio outbound audio helper (160-byte μ-law chunks)              */
/* ------------------------------------------------------------------ */
function sendAudioToTwilio(
  socket: WebSocket,
  streamSid: string,
  mulaw: Buffer,
): void {
  const chunkSize = 160;
  let offset = 0;
  const tick = (): void => {
    if (offset >= mulaw.length) return;
    const end = Math.min(offset + chunkSize, mulaw.length);
    const slice = mulaw.subarray(offset, end);
    offset = end;
    const payload = slice.toString("base64");
    socket.send(
      JSON.stringify({
        event: "media",
        streamSid,
        media: { payload },
      }),
    );
    setImmediate(tick);
  };
  tick();
}
