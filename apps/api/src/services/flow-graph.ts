import type {
  FlowEdge,
  FlowJson,
  ScenarioFlowNode,
} from "@logivoice/shared";

export function findNode(
  flow: FlowJson,
  id: string,
): ScenarioFlowNode | undefined {
  return flow.nodes.find((n) => n.id === id);
}

export function findEntryNodeId(flow: FlowJson): string | null {
  const targets = new Set(flow.edges.map((e) => e.target));
  const candidates = flow.nodes.filter((n) => !targets.has(n.id));
  if (candidates.length === 0) return flow.nodes[0]?.id ?? null;
  return candidates[0]?.id ?? null;
}

export function getNextFromEdge(
  flow: FlowJson,
  sourceId: string,
  sourceHandle?: string | null,
): string | null {
  const edges = flow.edges.filter((e) => e.source === sourceId);
  if (edges.length === 0) return null;
  if (sourceHandle) {
    const matched = edges.find((e) => e.sourceHandle === sourceHandle);
    return matched?.target ?? edges[0]?.target ?? null;
  }
  const noHandle = edges.find((e) => !e.sourceHandle);
  return (noHandle ?? edges[0])?.target ?? null;
}

export function getBranchEdgeTarget(
  flow: FlowJson,
  branchNodeId: string,
  branchId: string,
): string | null {
  const e = flow.edges.find(
    (x: FlowEdge) =>
      x.source === branchNodeId &&
      (x.sourceHandle === branchId || x.sourceHandle === `branch:${branchId}`),
  );
  return e?.target ?? null;
}
