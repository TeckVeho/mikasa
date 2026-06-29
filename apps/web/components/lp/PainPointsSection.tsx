import { LP_PAIN_POINTS } from "./content";
import { SectionHeading } from "./SectionHeading";

export function PainPointsSection() {
  return (
    <section id="pain-points" className="scroll-mt-24 bg-bg py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="こんな課題、ありませんか？"
          title="「対応しきれない」と「人が足りない」は、同時に来る。"
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {LP_PAIN_POINTS.map((item, index) => (
            <article
              key={item.title}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-semibold tracking-wider text-primary">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-text">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
