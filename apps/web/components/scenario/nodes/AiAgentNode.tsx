"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type AiAgentNodeData = { systemPrompt: string };

export function AiAgentNode({ data, selected }: NodeProps<AiAgentNodeData>) {
  return (
    <div
      className={cn(
        "min-h-[80px] w-[200px] rounded-md border-2 border-violet-600 bg-white p-2 shadow-sm",
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-xs font-bold text-violet-700">AI エージェント</div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-700">
        {(data.systemPrompt ?? "").slice(0, 40)}
        {(data.systemPrompt ?? "").length > 40 ? "…" : ""}
      </p>
      <Handle type="source" position={Position.Right} id="complete" />
      <Handle type="source" position={Position.Bottom} id="failure" />
    </div>
  );
}
