/** React Flow edge (editor + runtime graph) */
export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

export type SpeakNodeData = {
  text: string;
  speed: number;
  source?: "tts" | "template";
  templateId?: string;
};

export type ListenNodeData = {
  variableName: string;
  timeoutSeconds: number;
  retryCount: number;
  retryText: string;
  label?: string;
  excludeNumbers?: boolean;
  noRetryOnFail?: boolean;
  kanaConversion?: "none" | "name" | "all";
};

export type BranchBranch = {
  id: string;
  label: string;
  keywords?: string[];
  /** Legacy; graph edges are preferred */
  nextNodeId?: string;
};

export type BranchNodeData = {
  method: "ai" | "keyword";
  branches: BranchBranch[];
  aiPrompt?: string;
  defaultNextNodeId: string;
  inputVariable: string;
};

export type ApiCallNodeData = {
  url: string;
  method: "GET" | "POST" | "PUT";
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  responseMapping: Array<{ jsonPath: string; variableName: string }>;
  timeoutMs: number;
};

export type SmsNodeData = {
  to: string;
  body: string;
};

export type TransferNodeData = {
  to: string;
  timeout: number;
  onNoAnswer: string;
};

export type EndNodeData = {
  farewell?: string;
};

export type DtmfBranch = {
  id: string;
  digit: string;
  label: string;
};

export type DtmfNodeData = {
  promptText: string;
  variableName: string;
  numDigits: number;
  timeoutSeconds: number;
  speed: number;
  branches: DtmfBranch[];
  defaultNextNodeId: string;
};

export type AiAgentSlot = {
  name: string;
  description: string;
  required: boolean;
  variableName: string;
};

export type AiAgentNodeData = {
  systemPrompt: string;
  slots: AiAgentSlot[];
  maxTurns: number;
  openingLine?: string;
};

export type ScenarioNodeType =
  | "speak"
  | "listen"
  | "branch"
  | "api_call"
  | "sms"
  | "transfer"
  | "end"
  | "dtmf"
  | "ai_agent";

export type ScenarioFlowNode =
  | {
      id: string;
      type: "speak";
      data: SpeakNodeData;
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: "listen";
      data: ListenNodeData;
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: "branch";
      data: BranchNodeData;
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: "api_call";
      data: ApiCallNodeData;
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: "sms";
      data: SmsNodeData;
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: "transfer";
      data: TransferNodeData;
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: "end";
      data: EndNodeData;
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: "dtmf";
      data: DtmfNodeData;
      position: { x: number; y: number };
    }
  | {
      id: string;
      type: "ai_agent";
      data: AiAgentNodeData;
      position: { x: number; y: number };
    };

export type FlowJson = {
  nodes: ScenarioFlowNode[];
  edges: FlowEdge[];
};
