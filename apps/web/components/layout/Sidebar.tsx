"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "ダッシュボード", icon: "◈" },
  { href: "/numbers", label: "電話番号", icon: "◎" },
  { href: "/scenarios", label: "シナリオ", icon: "◇" },
  { href: "/calls", label: "通話ログ", icon: "◉" },
  { href: "/settings", label: "設定", icon: "◌" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
          LV
        </span>
        <span className="text-sm font-semibold tracking-tight text-[#1a1715]">
          LogiVoice
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-[#3d3530] hover:bg-primary/5 hover:text-[#1a1715]",
              )}
            >
              <span className="text-xs opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted">v0.1.0</p>
      </div>
    </aside>
  );
}
