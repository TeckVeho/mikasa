"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type BranchNodeData = {
  method: "ai" | "keyword";
  inputVariable: string;
};

export function BranchNode({ selected }: NodeProps<BranchNodeData>) {
  return (
    <div
      className={cn(
        "min-h-[80px] w-[200px] rounded-md border-2 border-orange-500 bg-white p-2 shadow-sm",
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-xs font-bold text-orange-700">分岐</div>
      <Handle type="source" position={Position.Right} id="default" />
      <Handle type="source" position={Position.Bottom} id="branch-a" />
      <Handle type="source" position={Position.Top} id="branch-b" />
    </div>
  );
}
