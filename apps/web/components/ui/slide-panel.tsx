"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SlidePanel({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = "lg",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const panelWidth =
    width === "md" ? "max-w-md" : width === "xl" ? "max-w-2xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 animate-fade-in"
        aria-label="閉じる"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative z-10 flex h-full w-full flex-col border-l border-border bg-white shadow-xl animate-slide-in-right",
          panelWidth,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-panel-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id="slide-panel-title" className="text-sm font-semibold text-text">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[13px] text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted transition-colors hover:bg-bg hover:text-text"
            aria-label="閉じる"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-border px-5 py-4">{footer}</div>
        ) : null}
      </aside>
    </div>
  );
}
