"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABEL_MAP: Record<string, string> = {
  dashboard: "ダッシュボード",
  numbers: "電話番号",
  scenarios: "シナリオ",
  calls: "通話ログ",
  callbacks: "折り返し予約",
  "voice-templates": "音声テンプレート",
  analytics: "VOC 分析",
  billing: "支払い",
  settings: "設定",
  edit: "編集",
  new: "新規作成",
};

function resolveLabel(segment: string): string {
  return LABEL_MAP[segment] ?? segment;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => ({
    label: resolveLabel(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="パンくずリスト" className="mb-4 flex items-center gap-1 text-sm">
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {!crumb.isLast ? (
            <>
              <Link
                href={crumb.href}
                className="text-muted transition-colors hover:text-text"
              >
                {crumb.label}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted/60" />
            </>
          ) : (
            <span className="font-medium text-text">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
