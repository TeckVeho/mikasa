"use client";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-[#3d3530]"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-[#1a1715] placeholder:text-muted outline-none transition-shadow focus:ring-2 focus:ring-primary/30",
          error && "border-danger focus:ring-danger/30",
          className,
        )}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
