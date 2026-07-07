"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABEL_MAP: Record<string, string> = {
  dashboard: "ダッシュボード",
  projects: "工事一覧",
  teams: "班別ビュー",
  historical: "過去実績",
  settings: "設定",
  edit: "編集",
  new: "新規作成",
  import: "CSVインポート",
};

function isProjectDetailPath(segments: string[]): boolean {
  return (
    segments[0] === "projects" &&
    segments.length === 2 &&
    segments[1] !== "new" &&
    segments[1] !== "import"
  );
}

function resolveLabel(segment: string): string {
  return LABEL_MAP[segment] ?? segment;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1 || isProjectDetailPath(segments)) return null;

  const crumbs = segments.map((seg, i) => ({
    label: resolveLabel(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="パンくずリスト" className="mb-4 flex items-center gap-1 text-[13px]">
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
              <ChevronRight className="h-3 w-3 text-muted/50" />
            </>
          ) : (
            <span className="font-medium text-text">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
