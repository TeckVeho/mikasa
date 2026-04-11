"use client";

import type { Edge, Node } from "reactflow";
import { create } from "zustand";

export type ScenarioEditorState = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  history: { nodes: Node[]; edges: Edge[] }[];
  historyIndex: number;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  selectNode: (id: string | null) => void;
  markSaved: () => void;
  loadFlow: (nodes: Node[], edges: Edge[]) => void;
};

export const useScenarioEditorStore = create<ScenarioEditorState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,
  history: [],
  historyIndex: -1,
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
  markSaved: () => set({ isDirty: false }),
  loadFlow: (nodes, edges) =>
    set({
      nodes,
      edges,
      isDirty: false,
      selectedNodeId: null,
    }),
}));
