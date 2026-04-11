"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { SpeakNode } from "./nodes/SpeakNode";
import { ListenNode } from "./nodes/ListenNode";
import { BranchNode } from "./nodes/BranchNode";
import {
  ApiCallNode,
  SmsNode,
  TransferNode,
  EndNode,
} from "./nodes/PlaceholderNodes";
import { NodePalette } from "./NodePalette";
import { PropertiesPanel } from "./PropertiesPanel";
import { useScenarioEditorStore } from "@/stores/scenario-editor.store";
import type { FlowJson } from "@logivoice/shared";

const nodeTypes = {
  speak: SpeakNode,
  listen: ListenNode,
  branch: BranchNode,
  api_call: ApiCallNode,
  sms: SmsNode,
  transfer: TransferNode,
  end: EndNode,
};

function toFlowJson(nodes: Node[], edges: Edge[]): FlowJson {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data,
      position: n.position,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
    })),
  } as FlowJson;
}

export function ScenarioEditorInner({
  initialName,
  initialFlow,
  onSave,
}: {
  initialName: string;
  initialFlow: FlowJson | null;
  onSave: (name: string, flow: FlowJson) => Promise<void>;
}) {
  const defaultNodes: Node[] = useMemo(
    () => [
      {
        id: "n1",
        type: "speak",
        position: { x: 100, y: 100 },
        data: { text: "お電話ありがとうございます。", speed: 1 },
      },
      {
        id: "n2",
        type: "listen",
        position: { x: 100, y: 260 },
        data: {
          variableName: "purpose",
          timeoutSeconds: 7,
          retryCount: 2,
          retryText: "もう一度お話しください。",
        },
      },
    ],
    [],
  );
  const defaultEdges: Edge[] = useMemo(
    () => [{ id: "e1", source: "n1", target: "n2" }],
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlow?.nodes?.length
      ? (initialFlow.nodes as unknown as Node[])
      : defaultNodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialFlow?.edges?.length ? (initialFlow.edges as Edge[]) : defaultEdges,
  );

  const selectNode = useScenarioEditorStore((s) => s.selectNode);
  const selectedNodeId = useScenarioEditorStore((s) => s.selectedNodeId);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{initialName}</h1>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm text-white"
          onClick={() => void onSave(initialName, toFlowJson(nodes, edges))}
        >
          保存
        </button>
      </div>
      <div className="flex min-h-0 flex-1 border border-border rounded-lg bg-surface">
        <NodePalette
          onAdd={(type, pos) => {
            const id = `n_${crypto.randomUUID().slice(0, 8)}`;
            const base = {
              id,
              type,
              position: pos ?? { x: 200, y: 200 },
              data: defaultDataFor(type),
            };
            setNodes((ns) => [...ns, base as Node]);
          }}
        />
        <div className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            onNodeClick={(_, n) => selectNode(n.id)}
            onPaneClick={() => selectNode(null)}
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
        <PropertiesPanel
          node={selectedNode}
          onChange={(id, data) => {
            setNodes((ns) =>
              ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
            );
          }}
        />
      </div>
    </div>
  );
}

function defaultDataFor(type: string): Record<string, unknown> {
  switch (type) {
    case "speak":
      return { text: "こんにちは", speed: 1 };
    case "listen":
      return {
        variableName: "field",
        timeoutSeconds: 7,
        retryCount: 2,
        retryText: "もう一度お話しください。",
      };
    case "branch":
      return {
        method: "ai",
        branches: [
          { id: "b1", label: "再配達", nextNodeId: "" },
          { id: "b2", label: "その他", nextNodeId: "" },
        ],
        defaultNextNodeId: "",
        inputVariable: "purpose",
      };
    case "api_call":
      return {
        url: "https://example.com",
        method: "GET",
        headers: {},
        responseMapping: [],
        timeoutMs: 5000,
      };
    case "sms":
      return { to: "{{caller_number}}", body: "お問い合わせありがとうございました。" };
    case "transfer":
      return { to: "+819012345678", timeout: 30, onNoAnswer: "" };
    case "end":
      return { farewell: "お電話ありがとうございました。" };
    default:
      return {};
  }
}

export function ScenarioEditor(props: {
  initialName: string;
  initialFlow: FlowJson | null;
  onSave: (name: string, flow: FlowJson) => Promise<void>;
}) {
  return (
    <ReactFlowProvider>
      <ScenarioEditorInner {...props} />
    </ReactFlowProvider>
  );
}
