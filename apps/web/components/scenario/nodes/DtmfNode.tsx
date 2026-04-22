"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type DtmfNodeData = {
  promptText: string;
  variableName: string;
  numDigits: number;
  timeoutSeconds: number;
};

export function DtmfNode({ data, selected }: NodeProps<DtmfNodeData>) {
  return (
    <div
      className={cn(
        "min-h-[80px] w-[200px] rounded-md border-2 border-indigo-600 bg-white p-2 shadow-sm",
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-xs font-bold text-indigo-700">DTMF / IVR</div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-700">
        {(data.promptText ?? "").slice(0, 40)}
        {(data.promptText ?? "").length > 40 ? "…" : ""}
      </p>
      <Handle type="source" position={Position.Right} id="default" />
      <Handle type="source" position={Position.Bottom} id="branch-a" />
      <Handle type="source" position={Position.Top} id="branch-b" />
    </div>
  );
}
