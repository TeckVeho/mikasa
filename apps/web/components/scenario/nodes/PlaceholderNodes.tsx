"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

function Shell({
  title,
  color,
  selected,
  children,
}: {
  title: string;
  color: string;
  selected?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-h-[72px] w-[200px] rounded-md border-2 bg-white p-2 shadow-sm",
        color,
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="text-xs font-bold">{title}</div>
      {children}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function ApiCallNode({ selected }: NodeProps) {
  return (
    <Shell title="API連携" color="border-purple-600" selected={selected} />
  );
}
export function SmsNode({ selected }: NodeProps) {
  return <Shell title="SMS" color="border-cyan-600" selected={selected} />;
}
export function TransferNode({ selected }: NodeProps) {
  return <Shell title="転送" color="border-red-600" selected={selected} />;
}
export function EndNode({ selected }: NodeProps) {
  return <Shell title="終了" color="border-slate-400" selected={selected} />;
}
