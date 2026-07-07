"use client";

import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { resetSessionCache } from "@/lib/session";

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
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text opacity-0 shadow-md transition-opacity duration-150 group-hover/item:opacity-100"
      >
        {label}
      </div>
    </div>
  );
}

const items = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/projects", label: "工事一覧", icon: FolderKanban },
  { href: "/teams", label: "班別ビュー", icon: Users },
  { href: "/historical", label: "過去実績", icon: History },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const queryClient = useQueryClient();

  async function handleLogout() {
    await logout();
    resetSessionCache(queryClient);
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-sidebar",
        collapsed ? "z-40 w-14 overflow-visible" : "w-56",
      )}
    >
      <div
        className={cn(
          "relative flex items-center gap-2 border-b border-border px-4 py-3",
          collapsed && "group justify-center px-0",
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white">
          M
        </span>
        {!collapsed && (
          <span className="text-sm font-semibold text-text">ミカサ金属</span>
        )}
        {collapsed && (
          <div
            role="tooltip"
            className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
          >
            ミカサ金属
          </div>
        )}
      </div>

      <nav
        className={cn(
          "flex flex-1 flex-col gap-px px-2 py-2 scrollbar-hide",
          collapsed ? "overflow-visible" : "overflow-y-auto",
        )}
      >
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
                  "flex items-center rounded-md px-2 py-1.5 text-[13px] transition-colors",
                  collapsed ? "w-full justify-center" : "gap-2.5 px-2.5",
                  active
                    ? "bg-primary/8 font-medium text-primary"
                    : "text-muted hover:bg-bg hover:text-text",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            </SidebarLabelPopup>
          );
        })}
      </nav>

      <div className="flex flex-col gap-px border-t border-border px-2 py-2">
        <SidebarLabelPopup label="ログアウト" collapsed={collapsed}>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center rounded-md px-2 py-1.5 text-[13px] text-muted transition-colors hover:bg-danger/5 hover:text-danger",
              collapsed ? "justify-center" : "gap-2.5 px-2.5",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "ログアウト"}
          </button>
        </SidebarLabelPopup>
        {collapsed ? (
          <SidebarLabelPopup label="メニューを展開" collapsed>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-[13px] text-muted transition-colors hover:bg-bg hover:text-text"
            >
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            </button>
          </SidebarLabelPopup>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-bg hover:text-text"
          >
            <PanelLeftClose className="h-4 w-4 shrink-0" />
            メニューを閉じる
          </button>
        )}
      </div>
    </aside>
  );
}
