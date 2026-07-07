"use client";

import { cn } from "@/lib/utils";

export function SettingsTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-bg p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            active === t.id
              ? "bg-white text-text shadow-sm"
              : "text-muted hover:text-text",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
      {footer && (
        <div className="border-t border-border bg-bg/40 px-5 py-3">{footer}</div>
      )}
    </div>
  );
}

export function SettingsTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto -mx-1", className)}>
      <table className="w-full min-w-[480px] text-sm">{children}</table>
    </div>
  );
}

export function SettingsTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border text-left text-xs font-medium text-muted">
        {children}
      </tr>
    </thead>
  );
}

export function SettingsTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border/60">{children}</tbody>;
}
