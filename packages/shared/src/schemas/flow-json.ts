import { z } from "zod";

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const speakDataSchema = z.object({
  text: z.string(),
  speed: z.number().min(0.8).max(1.5).default(1),
});

const listenDataSchema = z.object({
  variableName: z.string().min(1),
  timeoutSeconds: z.number().min(1).max(120).default(7),
  retryCount: z.number().min(0).max(10).default(2),
  retryText: z.string().default("もう一度お話しください。"),
  label: z.string().optional(),
  excludeNumbers: z.boolean().default(false),
  noRetryOnFail: z.boolean().default(false),
  kanaConversion: z.enum(["none", "name", "all"]).default("none"),
});

const branchBranchSchema = z.object({
  id: z.string(),
  label: z.string(),
  keywords: z.array(z.string()).optional(),
  /** Legacy; graph edges are preferred */
  nextNodeId: z.string().optional(),
});

const branchDataSchema = z.object({
  method: z.enum(["ai", "keyword"]),
  branches: z.array(branchBranchSchema).min(1),
  aiPrompt: z.string().optional(),
  defaultNextNodeId: z.string(),
  inputVariable: z.string().min(1),
});

const apiCallDataSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT"]),
  headers: z.record(z.string()).default({}),
  body: z.record(z.unknown()).optional(),
  responseMapping: z
    .array(
      z.object({
        jsonPath: z.string(),
        variableName: z.string(),
      }),
    )
    .default([]),
  timeoutMs: z.number().min(1000).max(30000).default(5000),
});

const smsDataSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1),
});

const transferDataSchema = z.object({
  to: z.string().min(1),
  timeout: z.number().min(5).max(120).default(30),
  onNoAnswer: z.string(),
});

const endDataSchema = z.object({
  farewell: z.string().optional(),
});

const dtmfBranchSchema = z.object({
  id: z.string(),
  digit: z.string(),
  label: z.string(),
});

const dtmfDataSchema = z.object({
  promptText: z.string(),
  variableName: z.string().min(1).default("dtmf_digit"),
  numDigits: z.number().min(1).max(20).default(1),
  timeoutSeconds: z.number().min(1).max(120).default(7),
  speed: z.number().min(0.8).max(1.5).default(1),
  branches: z.array(dtmfBranchSchema).min(1),
  defaultNextNodeId: z.string(),
});

const aiAgentSlotSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean().default(true),
  variableName: z.string().min(1),
});

const aiAgentDataSchema = z.object({
  systemPrompt: z.string(),
  slots: z.array(aiAgentSlotSchema).min(1),
  maxTurns: z.number().min(1).max(30).default(10),
  openingLine: z.string().optional(),
});

const scenarioFlowNodeSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("speak"),
    data: speakDataSchema,
    position: positionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("listen"),
    data: listenDataSchema,
    position: positionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("branch"),
    data: branchDataSchema,
    position: positionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("api_call"),
    data: apiCallDataSchema,
    position: positionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("sms"),
    data: smsDataSchema,
    position: positionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("transfer"),
    data: transferDataSchema,
    position: positionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("end"),
    data: endDataSchema,
    position: positionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("dtmf"),
    data: dtmfDataSchema,
    position: positionSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("ai_agent"),
    data: aiAgentDataSchema,
    position: positionSchema,
  }),
]);

export const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
});

export const flowJsonSchema = z.object({
  nodes: z.array(scenarioFlowNodeSchema),
  edges: z.array(flowEdgeSchema),
});

export type FlowJsonParsed = z.infer<typeof flowJsonSchema>;
