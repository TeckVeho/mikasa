"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const variants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "rounded-md bg-primary text-white hover:bg-primary-hover",
        secondary: "rounded-md bg-bg text-text border border-border hover:bg-border/40",
        danger: "rounded-md bg-danger text-white hover:bg-red-700",
        ghost: "rounded-md bg-transparent text-muted-foreground hover:bg-bg hover:text-text",
        outline: "rounded-md border border-border bg-white text-muted-foreground hover:bg-bg hover:text-text",
        pill: "rounded-full border border-border bg-white text-muted-foreground hover:bg-bg",
      },
      size: {
        sm: "h-7 px-2.5 text-xs gap-1",
        md: "h-8 px-3 text-[13px] gap-1.5",
        lg: "h-9 px-4 text-sm gap-1.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof variants> & {
    loading?: boolean;
    fullWidth?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  loading,
  fullWidth,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(variants({ variant, size }), fullWidth && "w-full", className)}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
