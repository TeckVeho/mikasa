import { LP_FEATURES } from "./content";
import { SectionHeading } from "./SectionHeading";

const PREVIEW_LABELS = ["着信モニター", "シナリオエディタ", "KPIダッシュボード"] as const;

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="LogiVoice でできること"
          title="LogiVoice がもたらす、3 つの変化。"
          description="AI音声ボットが24時間電話を受け、シナリオに沿って自動で対話を完結させます。"
        />

        <div className="mt-14 space-y-8">
          {LP_FEATURES.map((feature, index) => (
            <article
              key={feature.number}
              className="grid items-center gap-8 rounded-2xl border border-border bg-bg/60 p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12"
            >
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <p className="text-sm font-semibold text-primary">{feature.number}</p>
                <h3 className="mt-3 text-xl font-semibold text-text sm:text-2xl">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
                  {feature.body}
                </p>
              </div>

              <div
                className={`overflow-hidden rounded-2xl border border-border bg-white shadow-sm ${
                  index % 2 === 1 ? "lg:order-1" : ""
                }`}
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="text-xs font-medium text-muted">管理画面</p>
                  <p className="text-sm font-semibold text-text">
                    {PREVIEW_LABELS[index]}
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="h-3 w-2/3 rounded-full bg-border" />
                  <div className="h-3 w-full rounded-full bg-border/80" />
                  <div className="h-3 w-5/6 rounded-full bg-border/70" />
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="h-16 rounded-xl bg-primary/10" />
                    <div className="h-16 rounded-xl bg-primary/15" />
                    <div className="h-16 rounded-xl bg-primary/20" />
                  </div>
                  <div className="h-24 rounded-xl bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
