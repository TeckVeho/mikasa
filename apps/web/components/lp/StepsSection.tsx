import { LP_STEPS } from "./content";
import { SectionHeading } from "./SectionHeading";

export function StepsSection() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="導入の流れ"
          title="導入から成果まで、3 ステップ。"
          description="専用機器や複雑な設定は不要。電話番号を取得し、シナリオを設定するだけで始められます。"
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {LP_STEPS.map((step) => (
            <article
              key={step.number}
              className="relative rounded-2xl border border-border bg-bg/50 p-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {step.number}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-text">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
