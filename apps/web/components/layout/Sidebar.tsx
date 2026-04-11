"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Phone,
  GitBranch,
  PhoneCall,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/numbers", label: "電話番号", icon: Phone },
  { href: "/scenarios", label: "シナリオ", icon: GitBranch },
  { href: "/calls", label: "通話ログ", icon: PhoneCall },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[#e8e5e0] bg-[#f5f3f0] transition-all duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {/* ロゴ部分 */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-4",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
          LV
        </span>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-[#1a1715]">
            LogiVoice
          </span>
        )}
      </div>

      {/* ナビゲーション */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md px-2 py-2 text-sm transition-colors",
                collapsed ? "justify-center" : "gap-2.5 px-3",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted hover:bg-primary/5 hover:text-[#1a1715]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* フッター: バージョン + 折りたたみボタン */}
      <div
        className={cn(
          "flex items-center border-t border-[#e8e5e0] px-3 py-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && <p className="text-xs text-muted">v0.1.0</p>}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 text-muted hover:bg-primary/5 hover:text-[#1a1715] transition-colors"
          title={collapsed ? "展開する" : "折りたたむ"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
