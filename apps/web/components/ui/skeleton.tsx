import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-[#ddd6cc]", className)}
      aria-hidden
    />
  );
}
