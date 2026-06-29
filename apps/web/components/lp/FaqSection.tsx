"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LP_FAQ_ITEMS } from "./content";
import { SectionHeading } from "./SectionHeading";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 bg-bg py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="よくあるご質問"
          title="導入前に気になること、まとめました。"
        />

        <div className="mt-10 space-y-3">
          {LP_FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <article
                key={item.question}
                className="overflow-hidden rounded-2xl border border-border bg-white"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="text-sm font-medium text-text sm:text-base">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-border px-5 py-4">
                    <p className="text-sm leading-relaxed text-muted">{item.answer}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
