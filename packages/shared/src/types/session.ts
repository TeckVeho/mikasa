export type CallSessionStatus = "active" | "transferred" | "ended" | "error";

export type TranscriptSegment = {
  startMs: number;
  endMs: number;
  text: string;
};

export type ConversationTurn = {
  role: "system" | "assistant" | "user";
  content: string;
  timestamp: number;
};

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
  transcriptSegments?: TranscriptSegment[];
  accumulatedTranscript?: string;
  conversationHistory?: ConversationTurn[];
  aiAgent?: { nodeId: string; turn: number };
};
