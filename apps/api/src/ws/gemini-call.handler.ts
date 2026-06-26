import type { WebSocket } from "ws";
import type { CallSession } from "@logivoice/shared";
import twilio from "twilio";
import { GeminiLiveSession } from "../lib/gemini-live.js";
import {
  buildSystemInstruction,
  buildToolDeclarations,
} from "../services/prompt-builder.js";
import { getPronunciationDictionary } from "../services/pronunciation-dictionary.service.js";
import {
  dispatchToolCall,
  resolveTransferNumber,
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
import { createCallbackFinalizationCoordinator } from "./callback-finalization.js";
import { maybeCreateFallbackCallbackRequest } from "../services/callback-fallback.js";
import { logger } from "../lib/logger.js";
import { activeCallsStore } from "../services/active-calls.service.js";

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
    transferNumberClaims: string | null;
    transferTimeout: number;
  },
  tenantName: string,
): Promise<void> {
  const recordingMulawChunks: Buffer[] = [];
  let accumulatedTranscript = "";
  let finalized = false;
  const callLogId = newId();

  const gemini = new GeminiLiveSession();

  /** クロージング音声の再生待ち（Gemini は turnComplete 直後に close する） */
  const CALLBACK_POST_CLOSE_MS = 2500;

  const callbackFinalization = createCallbackFinalizationCoordinator({
    onBeginClosing: () => {
      gemini.close();
    },
    onEndCall: () => {
      void finalize("complete");
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    },
    postCloseMs: CALLBACK_POST_CLOSE_MS,
  });

  const pronunciationDictionary = await getPronunciationDictionary(
    session.tenantId,
  );

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
    pronunciationDictionary,
  });

  const tools = buildToolDeclarations(geminiScenario.toolDefinitions);

  const toolContext: ToolDispatchContext = {
    tenantId: session.tenantId,
    callSid,
    callerNumber: session.variables.caller_number ?? "",
    callLogId,
    transferNumber: geminiScenario.transferNumber,
    transferNumberClaims: geminiScenario.transferNumberClaims,
    transferTimeout: geminiScenario.transferTimeout,
    toolDefinitions: geminiScenario.toolDefinitions,
  };

  async function finalize(status: string): Promise<void> {
    if (finalized) return;
    callbackFinalization.warnIfInterrupted(`finalize:${status}`);
    finalized = true;

    gemini.close();
    activeCallsStore.end(callSid);

    let audioStoragePath: string | null = null;
    if (recordingMulawChunks.length > 0) {
      const pcm = mulawBuffersToPcm16Buffer(recordingMulawChunks);
      const wav = pcm16ToWavBuffer(pcm, 8000);
      audioStoragePath = await uploadCallRecording(
        session.tenantId,
        callLogId,
        wav,
      );
    }

    const transcriptText = accumulatedTranscript.trim() || null;
    await callRepo.upsertCallLogByTwilioSid({
      id: callLogId,
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

    try {
      await maybeCreateFallbackCallbackRequest({
        tenantId: session.tenantId,
        callSid,
        callerNumber: session.variables.caller_number ?? "unknown",
        transcript: accumulatedTranscript,
        wasRegistered: callbackFinalization.wasRegisteredSuccessfully(),
        callLogId,
      });
    } catch (err) {
      logger.error({ err, callSid }, "register_callback fallback failed");
    }

    await publishCallCompleted({
      tenantId: session.tenantId,
      callLogId,
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
      model: process.env.GEMINI_MODEL ?? "models/gemini-3.1-flash-live-preview",
      systemInstruction,
      tools: [{ functionDeclarations: tools }],
      voice: geminiScenario.voiceName,
      languageCode: geminiScenario.languageCode,
    },
    {
      onSetupComplete(resumed) {
        if (!resumed) {
          gemini.sendInitialTurn();
        }
      },

      onAudio(pcm24kChunk) {
        const pcm8k = resample24kTo8k(pcm24kChunk);
        const mulaw = pcm16ToMulawBuffer(pcm8k);
        sendAudioToTwilio(ws, streamSid, mulaw);
      },

      onTranscript(role, text) {
        if (text) {
          const prefix = role === "user" ? "お客様: " : "AI: ";
          accumulatedTranscript += prefix + text + "\n";
          activeCallsStore.updateTranscript(callSid, accumulatedTranscript);
        }
      },

      onToolCall(id, name, args) {
        void (async () => {
          try {
            const dispatchPromise = dispatchToolCall(
              { id, name, args },
              toolContext,
            );

            if (name === "register_callback") {
              callbackFinalization.trackRegisterCallbackDispatch(
                dispatchPromise.then((r) => ({
                  status: (r.result as { status?: string }).status,
                  error: (r.result as { error?: string }).error,
                })),
              );
            }

            const result = await dispatchPromise;
            gemini.sendToolResult(id, result.result);

            if (name === "register_callback") {
              const payload = result.result as { status?: string };
              if (payload.status === "registered") {
                callbackFinalization.onRegisterCallbackSucceeded();
              }
            }

            if (name === "transfer_to_operator") {
              const targetNumber = resolveTransferNumber(args, toolContext);
              if (geminiScenario.transferEnabled && targetNumber) {
                await cacheTransferInfo(callSid, {
                  transferNumber: targetNumber,
                  callerNumber: session.variables.caller_number ?? "",
                  timeout: geminiScenario.transferTimeout,
                  reason: String(args.reason ?? ""),
                });
                setTimeout(() => {
                  void (async () => {
                    try {
                      await executeTransfer(callSid, targetNumber);
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
        void callbackFinalization.onTurnComplete();
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
        if (callbackFinalization.shouldSkipOnClose()) return;
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
