import { cn } from "@/lib/utils";

export function VarianceDisplay({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", value < 0 && "text-danger", className)}>
      {value}
      {suffix}
    </span>
  );
}
