import { ShieldCheck } from "lucide-react";
import { LP_SECURITY_POINTS } from "./content";
import { SectionHeading } from "./SectionHeading";

export function SecuritySection() {
  return (
    <section className="bg-bg py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="通話データだから、設計で守る。"
          description="機微な通話データを扱うからこそ、セキュリティとプライバシーを最初から設計に組み込んでいます。"
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {LP_SECURITY_POINTS.map((point) => (
            <article
              key={point.title}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text">{point.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{point.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
