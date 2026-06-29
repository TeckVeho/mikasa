import { CheckCircle, Phone } from "lucide-react";
import { LP_HERO_BULLETS, LP_HERO_STATS } from "./content";

function DashboardPreview() {
  const bars = [42, 68, 55, 82, 61, 74, 48];

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-4 rounded-[28px] bg-white/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs font-medium text-muted">ダッシュボード</p>
            <p className="text-sm font-semibold text-text">受電サマリー</p>
          </div>
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            稼働中
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4">
          {[
            { label: "本日の受電", value: "248" },
            { label: "AI完結率", value: "78%" },
            { label: "平均対応", value: "32秒" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-bg px-3 py-3"
            >
              <p className="text-[11px] text-muted">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold text-text">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-4 py-4">
          <p className="mb-3 text-xs font-medium text-muted">時間帯別の受電件数</p>
          <div className="flex h-28 items-end gap-2">
            {bars.map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-md bg-gradient-to-t from-primary/70 to-primary"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-hover to-[#a8503a] pt-28 pb-20 text-white sm:pt-32 sm:pb-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_45%)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="animate-fade-in-up">
            <p className="text-sm font-medium tracking-wide text-white/80">
              物流の電話自動対応 × AI
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              物流の電話対応を、
              <br />
              AIでスマートに。
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              再配達受付も、配送状況の確認も、集荷依頼も。
              シナリオベースのAI音声対応で、24時間・自動で完結。
              オペレーターの負荷を大幅に削減します。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#contact"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-primary transition-colors hover:bg-white/90"
              >
                資料請求・お問い合わせ
              </a>
              <a
                href="#features"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/30 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                機能を見る
              </a>
            </div>

            <ul className="mt-8 space-y-3">
              {LP_HERO_BULLETS.map((text) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-fade-in-up [animation-delay:120ms]">
            <DashboardPreview />
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {LP_HERO_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm"
            >
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="mt-1 text-sm text-white/75">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-1/2 hidden -translate-x-1/2 lg:block">
        <Phone className="h-24 w-24 text-white/5" />
      </div>
    </section>
  );
}
