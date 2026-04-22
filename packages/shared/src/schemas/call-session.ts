import { z } from "zod";

export const transcriptSegmentSchema = z.object({
  startMs: z.number(),
  endMs: z.number(),
  text: z.string(),
});

export const conversationTurnSchema = z.object({
  role: z.enum(["system", "assistant", "user"]),
  content: z.string(),
  timestamp: z.number(),
});

export const callSessionSchema = z.object({
  callSid: z.string(),
  streamSid: z.string().nullable(),
  tenantId: z.string(),
  scenarioId: z.string(),
  phoneNumberId: z.string(),
  currentNodeId: z.string(),
  variables: z.record(z.string()),
  retryCount: z.number(),
  status: z.enum(["active", "transferred", "ended", "error"]),
  startedAt: z.number(),
  lastListenUtterance: z.string().optional(),
  /** Word / phrase segments with timestamps (AmiVoice) */
  transcriptSegments: z.array(transcriptSegmentSchema).optional(),
  /** Full transcript text built during the call */
  accumulatedTranscript: z.string().optional(),
  /** Hybrid AI agent: multi-turn context */
  conversationHistory: z.array(conversationTurnSchema).optional(),
  /** Active ai_agent node id + turn counter for hybrid engine */
  aiAgent: z
    .object({
      nodeId: z.string(),
      turn: z.number(),
    })
    .optional(),
});
