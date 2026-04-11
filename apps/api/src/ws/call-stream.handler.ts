import type { WebSocket } from "ws";
import type { CallSession } from "@logivoice/shared";
import type { FlowJson } from "@logivoice/shared";
import { advanceScenario } from "../services/scenario-engine.js";
import { synthesizeSpeech } from "../lib/google-tts.js";
import { pcm16ToMulawBuffer } from "../utils/audio.js";
import { mulawBase64ToPcm16Buffer } from "../utils/audio.js";
import { AmiVoiceSession } from "../lib/amivoice.js";
import { setSessionJson, getSessionJson } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { newId } from "../utils/id.js";
import * as callRepo from "../repositories/call-log.repo.js";
import { publishCallCompleted } from "../lib/pubsub.js";
import { logger } from "../lib/logger.js";
import { flowJsonSchema } from "@logivoice/shared";
import type { IncomingMessage } from "node:http";

type TwilioStreamMessage = {
  event: string;
  start?: {
    callSid: string;
    streamSid: string;
    customParameters?: Record<string, string>;
  };
  media?: { payload: string };
  stop?: { callSid: string };
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
        include: { scenario: true },
      });
      if (!phone?.scenarioId || !phone.scenario) {
        logger.warn({ called }, "No scenario for incoming number");
        ws.close();
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
      };

      await runEngine(ws, { type: "start" });
      return;
    }

    if (msg.event === "media" && msg.media && session && flow) {
      if (!listening || !amivoice) {
        return;
      }
      const pcm = mulawBase64ToPcm16Buffer(msg.media.payload);
      const b64 = pcm.toString("base64");
      amivoice.sendPcmBase64Chunk(b64);
      return;
    }

    if (msg.event === "stop" && session && callSid && flow) {
      amivoice?.end();
      await finalizeCall(session, callSid);
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
        amivoice = new AmiVoiceSession(process.env.AMIVOICE_APP_KEY ?? "");
        const conn = amivoice.connect((text) => {
          void (async () => {
            listening = false;
            amivoice?.end();
            amivoice = null;
            await runEngine(socket, { type: "utterance", text });
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

  async function finalizeCall(s: CallSession, sid: string) {
    const stored = await getSessionJson<CallSession>(`${SESSION_PREFIX}${sid}`);
    const finalSession = stored ?? s;
    const id = newId();
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
      transcriptText: null,
      durationSeconds: Math.round((Date.now() - finalSession.startedAt) / 1000),
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
