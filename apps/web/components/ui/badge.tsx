import { cn } from "@/lib/utils";

const map = {
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
  neutral: "bg-border/60 text-muted-foreground",
  info: "bg-primary/12 text-primary",
} as const;

export function Badge({
  variant,
  children,
  className,
}: {
  variant: keyof typeof map;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        map[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
