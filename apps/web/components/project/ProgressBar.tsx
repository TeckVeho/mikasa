import { cn } from "@/lib/utils";

type Props = {
  rate: number;
  size?: "sm" | "md";
  className?: string;
};

export function ProgressBar({ rate, size = "sm", className }: Props) {
  const over = rate > 100;
  const width = Math.min(Math.max(rate, 0), 100);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-full bg-border",
          size === "sm" ? "h-1.5 w-14" : "h-2 min-w-[6rem] flex-1",
        )}
      >
        <div
          className={cn("h-full rounded-full", over ? "bg-danger" : "bg-primary")}
          style={{ width: `${width}%` }}
        />
      </div>
      <span
        className={cn(
          "tabular-nums",
          size === "sm" ? "min-w-[2.25rem] text-right text-[11px]" : "text-sm font-medium",
          over && "text-danger",
        )}
      >
        {rate}%
      </span>
    </div>
  );
}
