import Link from "next/link";
import { LP_NAV_ITEMS } from "./content";

const FOOTER_LINKS = {
  product: [
    { label: "機能・価値", href: "#features" },
    { label: "ユースケース", href: "#use-cases" },
    { label: "料金", href: "#pricing" },
    { label: "よくある質問", href: "#faq" },
  ],
  company: [
    { label: "会社情報", href: "#contact" },
    { label: "プライバシーポリシー", href: "#contact" },
    { label: "利用規約", href: "#contact" },
  ],
  support: [
    { label: "お問い合わせ", href: "#contact" },
    { label: "試験導入の相談", href: "#contact" },
    { label: "資料請求", href: "#contact" },
  ],
} as const;

export function LpFooter() {
  return (
    <footer className="border-t border-border bg-[#f5f3f0]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
                LV
              </span>
              <span className="text-lg font-semibold tracking-tight text-text">
                LogiVoice
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              物流の電話対応を、AIでスマートに。24時間の自動応答で、オペレーターの負荷を大幅に削減します。
            </p>
          </div>

          {(
            [
              ["製品", FOOTER_LINKS.product],
              ["会社", FOOTER_LINKS.company],
              ["サポート", FOOTER_LINKS.support],
            ] as const
          ).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-text">{title}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-text"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} LogiVoice
          </p>
          <nav className="flex flex-wrap gap-4">
            {LP_NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs text-muted transition-colors hover:text-text"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
