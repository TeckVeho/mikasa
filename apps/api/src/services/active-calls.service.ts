import { EventEmitter } from "node:events";

export type ActiveCall = {
  callSid: string;
  tenantId: string;
  callerNumber: string;
  scenarioId: string;
  startedAt: number;
  transcript: string;
  status: "active" | "ended";
};

export type ActiveCallEvent =
  | { type: "call_started"; call: ActiveCall }
  | { type: "transcript_update"; callSid: string; tenantId: string; transcript: string }
  | { type: "call_ended"; callSid: string; tenantId: string };

class ActiveCallsStore {
  private calls = new Map<string, ActiveCall>();
  readonly events = new EventEmitter();

  start(call: ActiveCall): void {
    this.calls.set(call.callSid, call);
    this.events.emit("change", { type: "call_started", call } satisfies ActiveCallEvent);
  }

  updateTranscript(callSid: string, transcript: string): void {
    const call = this.calls.get(callSid);
    if (!call) return;
    call.transcript = transcript;
    this.events.emit("change", {
      type: "transcript_update",
      callSid,
      tenantId: call.tenantId,
      transcript,
    } satisfies ActiveCallEvent);
  }

  end(callSid: string): void {
    const call = this.calls.get(callSid);
    if (!call) return;
    const tenantId = call.tenantId;
    this.calls.delete(callSid);
    this.events.emit("change", { type: "call_ended", callSid, tenantId } satisfies ActiveCallEvent);
  }

  getByTenant(tenantId: string): ActiveCall[] {
    return Array.from(this.calls.values()).filter((c) => c.tenantId === tenantId);
  }
}

export const activeCallsStore = new ActiveCallsStore();
