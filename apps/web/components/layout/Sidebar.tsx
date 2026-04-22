"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Phone,
  GitBranch,
  PhoneCall,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  CreditCard,
  BarChart3,
  PhoneForwarded,
  Mic2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";

/** 折りたたみ時のみ、右側にラベルをポップアップ表示 */
function SidebarLabelPopup({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  if (!collapsed) return <>{children}</>;
  return (
    <div className="group/item relative w-full">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute left-full top-0 z-50 flex h-full min-h-[2.25rem] items-center pl-2"
      >
        <span
          className={cn(
            "whitespace-nowrap rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text shadow-md",
            "opacity-0 transition-opacity duration-150",
            "group-hover/item:opacity-100",
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

type Item = { href: string; label: string; icon: typeof LayoutDashboard };

const items: Item[] = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/numbers", label: "電話番号", icon: Phone },
  { href: "/scenarios", label: "シナリオ", icon: GitBranch },
  { href: "/calls", label: "通話ログ", icon: PhoneCall },
  { href: "/callbacks", label: "折り返し予約", icon: PhoneForwarded },
  { href: "/voice-templates", label: "音声テンプレート", icon: Mic2 },
  { href: "/analytics", label: "VOC 分析", icon: BarChart3 },
  { href: "/billing", label: "支払い", icon: CreditCard },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-sidebar",
        collapsed ? "w-14" : "w-60",
      )}
    >
      <div
        className={cn(
          "relative flex items-center gap-2 px-4 py-4",
          collapsed && "group justify-center px-0",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
          LV
        </span>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-text">
            LogiVoice
          </span>
        )}
        {collapsed && (
          <div
            role="tooltip"
            className="pointer-events-none absolute left-full z-50 ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          >
            LogiVoice
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4 scrollbar-hide">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <SidebarLabelPopup key={item.href} label={item.label} collapsed={collapsed}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-2 py-2 text-sm transition-colors",
                  collapsed ? "w-full justify-center" : "gap-2.5 px-3",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted hover:bg-primary/5 hover:text-text",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            </SidebarLabelPopup>
          );
        })}
      </nav>

      <div
        className={cn(
          "flex flex-col gap-1 border-t border-border px-2 py-3",
        )}
      >
        <SidebarLabelPopup label="ログアウト" collapsed={collapsed}>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex items-center rounded-md px-2 py-2 text-sm text-muted transition-colors hover:bg-danger/5 hover:text-danger",
              collapsed ? "w-full justify-center" : "gap-2.5 px-3",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "ログアウト"}
          </button>
        </SidebarLabelPopup>

        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "justify-between px-1",
        )}>
          {!collapsed && <p className="text-xs text-muted">v0.1.0</p>}
          {collapsed ? (
            <SidebarLabelPopup label="展開する" collapsed>
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="rounded-md p-1 text-muted hover:bg-primary/5 hover:text-text transition-colors"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </SidebarLabelPopup>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1 text-muted hover:bg-primary/5 hover:text-text transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
