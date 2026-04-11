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
};

export type ListenNodeData = {
  variableName: string;
  timeoutSeconds: number;
  retryCount: number;
  retryText: string;
  label?: string;
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

export type ScenarioNodeType =
  | "speak"
  | "listen"
  | "branch"
  | "api_call"
  | "sms"
  | "transfer"
  | "end";

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
    };

export type FlowJson = {
  nodes: ScenarioFlowNode[];
  edges: FlowEdge[];
};
