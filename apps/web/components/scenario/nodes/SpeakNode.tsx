"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type SpeakNodeData = { text: string; speed: number };

export function SpeakNode({ data, selected }: NodeProps<SpeakNodeData>) {
  return (
    <div
      className={cn(
        "min-h-[80px] w-[200px] rounded-md border-2 border-blue-500 bg-white p-2 shadow-sm",
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-xs font-bold text-blue-700">発話</div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-700">
        {data.text.slice(0, 40)}
        {data.text.length > 40 ? "…" : ""}
      </p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
