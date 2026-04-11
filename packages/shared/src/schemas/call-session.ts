import { z } from "zod";

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
});
