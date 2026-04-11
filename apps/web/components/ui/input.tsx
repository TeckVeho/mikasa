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
          "w-full rounded-xl border border-[#e8e5e0] bg-white px-4 py-2.5 text-sm text-[#1a1715] placeholder:text-[#9e9890] outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
          error && "border-danger focus:ring-danger/20",
          className,
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
