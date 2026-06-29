"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LP_NAV_ITEMS } from "./content";

function Logo({ light }: { light: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white",
          light ? "bg-white/20 backdrop-blur-sm" : "bg-primary",
        )}
      >
        LV
      </span>
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          light ? "text-white" : "text-text",
        )}
      >
        LogiVoice
      </span>
    </Link>
  );
}

export function LpHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const lightHeader = !scrolled && !menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled || menuOpen
          ? "border-b border-border/80 bg-bg/95 backdrop-blur-md shadow-sm"
          : "border-b border-white/10 bg-black/10 backdrop-blur-sm",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo light={lightHeader} />

        <nav className="hidden items-center gap-8 lg:flex">
          {LP_NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors",
                lightHeader
                  ? "text-white/90 hover:text-white"
                  : "text-muted hover:text-text",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className={cn(
              "text-sm font-medium transition-colors",
              lightHeader
                ? "text-white/90 hover:text-white"
                : "text-muted hover:text-text",
            )}
          >
            ログイン
          </Link>
          <a
            href="#contact"
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors",
              lightHeader
                ? "bg-white text-primary hover:bg-white/90"
                : "bg-primary text-white hover:bg-primary-hover",
            )}
          >
            資料請求・お問い合わせ
          </a>
        </div>

        <button
          type="button"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl border lg:hidden",
            lightHeader
              ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
              : "border-border bg-white text-text hover:bg-bg",
          )}
          aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-border bg-bg px-4 py-6 lg:hidden">
          <nav className="flex flex-col gap-4">
            {LP_NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-base text-text"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              className="text-base text-text"
              onClick={() => setMenuOpen(false)}
            >
              ログイン
            </Link>
            <a
              href="#contact"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              資料請求・お問い合わせ
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
