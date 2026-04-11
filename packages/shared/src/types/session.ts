export type CallSessionStatus = "active" | "transferred" | "ended" | "error";

export type CallSession = {
  callSid: string;
  streamSid: string | null;
  tenantId: string;
  scenarioId: string;
  phoneNumberId: string;
  currentNodeId: string;
  variables: Record<string, string>;
  retryCount: number;
  status: CallSessionStatus;
  startedAt: number;
  /** Last partial STT buffer key for listen node */
  lastListenUtterance?: string;
};
