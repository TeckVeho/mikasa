import { describe, it, expect } from "vitest";
import { findEntryNodeId } from "./flow-graph.js";
import type { FlowJson } from "@logivoice/shared";

describe("findEntryNodeId", () => {
  it("returns node with no incoming edges", () => {
    const flow: FlowJson = {
      nodes: [
        {
          id: "a",
          type: "speak",
          data: { text: "x", speed: 1 },
          position: { x: 0, y: 0 },
        },
        {
          id: "b",
          type: "end",
          data: {},
          position: { x: 0, y: 0 },
        },
      ],
      edges: [{ id: "e1", source: "a", target: "b" }],
    };
    expect(findEntryNodeId(flow)).toBe("a");
  });
});
