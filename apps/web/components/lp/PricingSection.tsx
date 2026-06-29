import { Check } from "lucide-react";
import { LP_PRICING_NOTES, LP_PRICING_PLANS } from "./content";
import { SectionHeading } from "./SectionHeading";

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="料金プラン"
          title="利用量にあわせて、最適なプランを。"
          description="月額基本料 + 従量課金のハイブリッド型。含まれる通話件数を超えた分のみ追加料金が発生します。"
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {LP_PRICING_PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
                plan.featured
                  ? "border-primary bg-primary/[0.03] shadow-md"
                  : "border-border bg-bg/40"
              }`}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                  おすすめ
                </span>
              ) : null}

              <div>
                <h3 className="text-xl font-semibold text-text">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted">{plan.description}</p>

                <div className="mt-6">
                  <p className="text-3xl font-semibold tracking-tight text-text">
                    {plan.monthlyPrice}
                    <span className="ml-1 text-base font-normal text-muted">/月</span>
                  </p>
                  {plan.annualPrice ? (
                    <p className="mt-1 text-sm text-muted">
                      年払い {plan.annualPrice}/月相当
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">{plan.annualNote}</p>
                </div>

                <dl className="mt-5 space-y-2 rounded-xl border border-border bg-white/80 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">初期費用</dt>
                    <dd className="font-medium text-text">{plan.setupFee}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">含む通話</dt>
                    <dd className="font-medium text-text">{plan.includedCalls}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">超過</dt>
                    <dd className="font-medium text-text">{plan.overagePrice}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">電話番号</dt>
                    <dd className="font-medium text-text">{plan.phoneNumbers}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">同時通話</dt>
                    <dd className="font-medium text-text">{plan.concurrentCalls}</dd>
                  </div>
                </dl>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-text">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="#contact"
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  plan.featured
                    ? "bg-primary text-white hover:bg-primary-hover"
                    : "border border-border bg-white text-text hover:bg-bg"
                }`}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>

        <ul className="mt-8 flex flex-col gap-2 text-center text-xs text-muted sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6">
          {LP_PRICING_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
