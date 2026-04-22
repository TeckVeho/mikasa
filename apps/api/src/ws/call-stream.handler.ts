import type { WebSocket } from "ws";
import type { CallSession } from "@logivoice/shared";
import type { FlowJson } from "@logivoice/shared";
import { advanceScenario } from "../services/scenario-engine.js";
import { synthesizeSpeech } from "../lib/google-tts.js";
import {
  pcm16ToMulawBuffer,
  mulawBase64ToPcm16Buffer,
  mulawBuffersToPcm16Buffer,
  pcm16ToWavBuffer,
} from "../utils/audio.js";
import { uploadCallRecording } from "../lib/storage.js";
import { AmiVoiceSession } from "../lib/amivoice.js";
import { setSessionJson, getSessionJson } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import * as callRepo from "../repositories/call-log.repo.js";
import { publishCallCompleted } from "../lib/pubsub.js";
import { logger } from "../lib/logger.js";
import { flowJsonSchema } from "@logivoice/shared";
import type { IncomingMessage } from "node:http";
import { handleGeminiLiveCall } from "./gemini-call.handler.js";
import * as geminiRepo from "../repositories/gemini-scenario.repo.js";

type TwilioStreamMessage = {
  event: string;
  start?: {
    callSid: string;
    streamSid: string;
    customParameters?: Record<string, string>;
  };
  media?: { payload: string };
  stop?: { callSid: string };
  dtmf?: { digit?: string; track?: string };
};

const SESSION_PREFIX = "session:";
const SESSION_TTL = 3600;

export function attachCallStreamHandler(
  ws: WebSocket,
  req: IncomingMessage,
): void {
  const url = new URL(req.url ?? "", "http://localhost");
  const queryCalled = url.searchParams.get("called") ?? "";
  const queryFrom = url.searchParams.get("from") ?? "";

  let streamSid: string | null = null;
  let callSid: string | null = null;
  let amivoice: AmiVoiceSession | null = null;
  let listening = false;
  let session: CallSession | null = null;
  let flow: FlowJson | null = null;
  /** Inbound μ-law chunks from Twilio (base64-decoded) for full-call recording */
  const recordingMulawChunks: Buffer[] = [];
  let dtmfTimeout: ReturnType<typeof setTimeout> | null = null;
  let waitingForDtmf = false;
  let expectedDtmfDigits = 1;
  let dtmfBuffer = "";
  /** Wall time when current listen node started (for transcript segment alignment) */
  let lastListenStartedAt = 0;

  function clearDtmfTimeout(): void {
    if (dtmfTimeout) {
      clearTimeout(dtmfTimeout);
      dtmfTimeout = null;
    }
  }

  ws.on("message", async (raw: Buffer) => {
    let msg: TwilioStreamMessage;
    try {
      msg = JSON.parse(raw.toString()) as TwilioStreamMessage;
    } catch {
      return;
    }

    if (msg.event === "connected") {
      return;
    }

    if (
      msg.event === "dtmf" &&
      msg.dtmf?.digit &&
      session &&
      flow &&
      waitingForDtmf
    ) {
      const digit = msg.dtmf.digit;
      dtmfBuffer += digit;
      if (dtmfBuffer.length >= expectedDtmfDigits) {
        clearDtmfTimeout();
        waitingForDtmf = false;
        const combined = dtmfBuffer.slice(0, expectedDtmfDigits);
        dtmfBuffer = "";
        await runEngine(ws, { type: "dtmf_digit", digit: combined });
      }
      return;
    }

    if (msg.event === "start" && msg.start) {
      streamSid = msg.start.streamSid;
      callSid = msg.start.callSid;
      const called =
        msg.start.customParameters?.called ??
        msg.start.customParameters?.Called ??
        queryCalled;
      const from =
        msg.start.customParameters?.from ??
        msg.start.customParameters?.From ??
        queryFrom;

      const phone = await prisma.phoneNumber.findFirst({
        where: { number: called },
        include: { scenario: true, tenant: true },
      });
      if (!phone) {
        logger.warn({ called }, "No phone record for incoming number");
        ws.close();
        return;
      }
      if (phone.tenant.maintenanceMode) {
        const msg =
          phone.tenant.maintenanceMessage ??
          "只今メンテナンス中です。しばらくしてからお電話ください。";
        const tts = await synthesizeSpeech({ text: msg, speed: 1 });
        if (tts.ok && streamSid) {
          const mulawBuf = pcm16ToMulawBuffer(tts.data);
          await sendAudioToTwilio(ws, streamSid, mulawBuf);
        }
        ws.close();
        return;
      }
      if (!phone.scenarioId || !phone.scenario) {
        logger.warn({ called }, "No scenario for incoming number");
        ws.close();
        return;
      }

      // Gemini Live mode: delegate to dedicated handler
      const voiceEngine = (phone.tenant as Record<string, unknown>).voiceEngine as string | undefined;
      if (voiceEngine === "gemini_live") {
        const gs = await geminiRepo.getByScenarioId(phone.scenarioId);
        if (!gs) {
          logger.warn({ scenarioId: phone.scenarioId }, "No gemini scenario found");
          ws.close();
          return;
        }
        const geminiSession: CallSession = {
          callSid: callSid!,
          streamSid,
          tenantId: phone.tenantId,
          scenarioId: phone.scenarioId,
          phoneNumberId: phone.id,
          currentNodeId: "",
          variables: { caller_number: from || "" },
          retryCount: 0,
          status: "active",
          startedAt: Date.now(),
          transcriptSegments: [],
          accumulatedTranscript: "",
        };
        await handleGeminiLiveCall(
          ws,
          streamSid!,
          callSid!,
          geminiSession,
          {
            persona: gs.persona,
            conversationRules: gs.conversationRules,
            businessKnowledge: gs.businessKnowledge,
            guardRails: gs.guardRails,
            toolDefinitions: gs.toolDefinitions as unknown[],
            voiceName: gs.voiceName,
            languageCode: gs.languageCode,
            transferEnabled: gs.transferEnabled,
            transferNumber: gs.transferNumber,
            transferTimeout: gs.transferTimeout,
          },
          phone.tenant.name,
        );
        return;
      }

      const rawFlow = phone.scenario.flowJson;
      const parsed = flowJsonSchema.safeParse(rawFlow);
      if (!parsed.success) {
        logger.error("Invalid flow json");
        ws.close();
        return;
      }
      flow = parsed.data as FlowJson;

      session = {
        callSid: callSid!,
        streamSid,
        tenantId: phone.tenantId,
        scenarioId: phone.scenarioId,
        phoneNumberId: phone.id,
        currentNodeId: "",
        variables: {
          caller_number: from || "",
        },
        retryCount: 0,
        status: "active",
        startedAt: Date.now(),
        transcriptSegments: [],
        accumulatedTranscript: "",
      };

      await runEngine(ws, { type: "start" });
      return;
    }

    if (msg.event === "media" && msg.media && session && flow) {
      recordingMulawChunks.push(Buffer.from(msg.media.payload, "base64"));
      if (!listening || !amivoice) {
        return;
      }
      const pcm = mulawBase64ToPcm16Buffer(msg.media.payload);
      const b64 = pcm.toString("base64");
      amivoice.sendPcmBase64Chunk(b64);
      return;
    }

    if (msg.event === "stop" && session && callSid && flow) {
      clearDtmfTimeout();
      waitingForDtmf = false;
      amivoice?.end();
      await finalizeCall(session, callSid, recordingMulawChunks);
      recordingMulawChunks.length = 0;
      listening = false;
      session = null;
      flow = null;
    }
  });

  async function runEngine(
    socket: WebSocket,
    ev: Parameters<typeof advanceScenario>[2],
  ) {
    if (!session || !flow) return;
    const r = await advanceScenario(session, flow, ev);
    if (!r.ok) {
      logger.error({ err: r.error }, "advanceScenario failed");
      return;
    }
    session = r.session;
    if (callSid) {
      await setSessionJson(
        `${SESSION_PREFIX}${callSid}`,
        session,
        SESSION_TTL,
      );
    }

    for (const effect of r.effects) {
      if (effect.type === "speak") {
        const tts = await synthesizeSpeech({
          text: effect.text,
          speed: effect.speed,
        });
        if (!tts.ok || !streamSid) continue;
        const mulawBuf = pcm16ToMulawBuffer(tts.data);
        await sendAudioToTwilio(socket, streamSid, mulawBuf);
        await runEngine(socket, { type: "tts_done" });
        return;
      }
      if (effect.type === "listen") {
        listening = true;
        lastListenStartedAt = Date.now();
        amivoice = new AmiVoiceSession(process.env.AMIVOICE_APP_KEY ?? "");
        const conn = amivoice.connect((result) => {
          void (async () => {
            listening = false;
            amivoice?.end();
            amivoice = null;
            if (session) {
              const prev = session.transcriptSegments ?? [];
              const base = lastListenStartedAt - session.startedAt;
              const shifted = result.segments.map((s) => ({
                ...s,
                startMs: base + s.startMs,
                endMs: base + s.endMs,
              }));
              const merged = [...prev, ...shifted];
              const acc =
                (session.accumulatedTranscript ?? "").trim() +
                (session.accumulatedTranscript ? "\n" : "") +
                result.text;
              session = {
                ...session,
                transcriptSegments: merged,
                accumulatedTranscript: acc,
              };
              if (callSid) {
                await setSessionJson(
                  `${SESSION_PREFIX}${callSid}`,
                  session,
                  SESSION_TTL,
                );
              }
            }
            await runEngine(socket, { type: "utterance", text: result.text });
          })();
        });
        if (!conn.ok) {
          await runEngine(socket, {
            type: "utterance",
            text: "",
          });
        }
        return;
      }
      if (effect.type === "listen_dtmf") {
        waitingForDtmf = true;
        expectedDtmfDigits = effect.numDigits;
        dtmfBuffer = "";
        clearDtmfTimeout();
        dtmfTimeout = setTimeout(() => {
          void (async () => {
            if (!waitingForDtmf) return;
            waitingForDtmf = false;
            dtmfBuffer = "";
            dtmfTimeout = null;
            await runEngine(socket, { type: "dtmf_digit", digit: "" });
          })();
        }, effect.timeoutSeconds * 1000);
        return;
      }
      if (effect.type === "end") {
        socket.close();
        return;
      }
      if (effect.type === "transfer") {
        session.status = "transferred";
        socket.close();
        return;
      }
    }
  }

  async function finalizeCall(
    s: CallSession,
    sid: string,
    mulawChunks: Buffer[],
  ) {
    const stored = await getSessionJson<CallSession>(`${SESSION_PREFIX}${sid}`);
    const finalSession = stored ?? s;
    const id = newId();
    let audioStoragePath: string | null = null;
    if (mulawChunks.length > 0) {
      const pcm = mulawBuffersToPcm16Buffer(mulawChunks);
      const wav = pcm16ToWavBuffer(pcm, 8000);
      audioStoragePath = await uploadCallRecording(
        finalSession.tenantId,
        id,
        wav,
      );
    }
    const transcriptText =
      finalSession.accumulatedTranscript?.trim() || null;
    const transcriptSegments =
      finalSession.transcriptSegments && finalSession.transcriptSegments.length > 0
        ? finalSession.transcriptSegments
        : null;
    await callRepo.upsertCallLogByTwilioSid({
      id,
      tenantId: finalSession.tenantId,
      phoneNumberId: finalSession.phoneNumberId,
      scenarioId: finalSession.scenarioId,
      twilioCallSid: sid,
      callerNumber: finalSession.variables.caller_number ?? "unknown",
      status:
        finalSession.status === "transferred"
          ? "transferred"
          : finalSession.status === "ended"
            ? "complete"
            : "abandoned",
      transcriptText,
      transcriptSegments,
      durationSeconds: Math.round((Date.now() - finalSession.startedAt) / 1000),
      audioStoragePath,
    });
    await publishCallCompleted({ tenantId: finalSession.tenantId, callLogId: id });
  }
}

function sendAudioToTwilio(
  socket: WebSocket,
  streamSid: string,
  mulaw: Buffer,
): Promise<void> {
  const chunkSize = 160;
  return new Promise((resolve) => {
    let offset = 0;
    const tick = (): void => {
      if (offset >= mulaw.length) {
        resolve();
        return;
      }
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
  });
}
