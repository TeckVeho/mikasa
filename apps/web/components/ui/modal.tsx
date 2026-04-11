"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const width =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full rounded-xl bg-surface p-6 shadow-lg",
          width,
        )}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="mb-4 text-base font-semibold text-[#1a1715]">{title}</h2>
        {children}
        {footer ? (
          <div className="mt-6 flex justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
