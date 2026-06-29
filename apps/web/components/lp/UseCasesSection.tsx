"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LP_USE_CASES } from "./content";
import { SectionHeading } from "./SectionHeading";

export function UseCasesSection() {
  const [activeId, setActiveId] = useState<(typeof LP_USE_CASES)[number]["id"]>(
    LP_USE_CASES[0].id,
  );
  const activeCase =
    LP_USE_CASES.find((item) => item.id === activeId) ?? LP_USE_CASES[0];

  return (
    <section id="use-cases" className="scroll-mt-24 bg-bg py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="ユースケース"
          title="物流の現場で、こう使われています。"
        />

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {LP_USE_CASES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                activeId === item.id
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-muted hover:text-text",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-8 rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-medium text-primary">{activeCase.label}</p>
            <h3 className="mt-3 text-2xl font-semibold text-text">
              {activeCase.title}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              {activeCase.body}
            </p>
            <ul className="mt-6 space-y-3">
              {activeCase.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-text">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-bg">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-medium text-muted">画面イメージ</p>
              <p className="text-sm font-semibold text-text">{activeCase.label}</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15" />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 w-1/2 rounded-full bg-border" />
                    <div className="h-2.5 w-3/4 rounded-full bg-border/80" />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="h-2.5 w-1/3 rounded-full bg-border" />
                <div className="mt-3 h-2.5 w-full rounded-full bg-border/80" />
                <div className="mt-2 h-2.5 w-5/6 rounded-full bg-border/70" />
              </div>
              <div className="rounded-xl bg-primary/10 p-4">
                <div className="h-2.5 w-2/5 rounded-full bg-primary/30" />
                <div className="mt-3 h-10 rounded-lg bg-primary/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
