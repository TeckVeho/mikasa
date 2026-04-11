"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export type ListenNodeData = {
  variableName: string;
  timeoutSeconds: number;
  retryCount: number;
  retryText: string;
};

export function ListenNode({ data, selected }: NodeProps<ListenNodeData>) {
  return (
    <div
      className={cn(
        "min-h-[80px] w-[200px] rounded-md border-2 border-green-600 bg-white p-2 shadow-sm",
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-xs font-bold text-green-700">ヒアリング</div>
      <p className="mt-1 text-xs text-slate-700">{data.variableName}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
