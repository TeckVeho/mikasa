"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const variants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "rounded-lg bg-primary text-white hover:bg-primary-hover",
        secondary: "rounded-lg bg-[#ede9e3] text-[#1a1715] hover:bg-[#e3ddd6]",
        danger: "rounded-lg bg-danger text-white hover:bg-red-700",
        ghost: "rounded-lg bg-transparent text-[#3d3530] hover:bg-primary/5",
        outline: "rounded-lg border border-[#e8e5e0] bg-white text-[#3d3530] hover:bg-[#faf9f7]",
        pill: "rounded-full border border-[#e8e5e0] bg-white text-[#3d3530] hover:bg-[#faf9f7]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
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
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
