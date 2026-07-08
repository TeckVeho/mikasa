/** 工事一覧・班別ビューで共通の工程セクション配色 */

export const PROCESS_COLUMNS = [
  "組立前",
  "組立",
  "溶接",
  "歪取り",
  "塗装",
  "仕上げ",
] as const;

export type ProcessColumnName = (typeof PROCESS_COLUMNS)[number];

export type ProcessRowColorSet = {
  label: string;
  cell: string;
  plannedCell: string;
  sticky: string;
  plannedSticky: string;
};

export const PROCESS_SECTION_COLORS = {
  forging: {
    header: "bg-sky-100/80 text-sky-900",
    cell: "bg-sky-50/40",
    sticky: "bg-sky-50/40",
  },
  welding: {
    header: "bg-orange-100/80 text-orange-900",
    cell: "bg-orange-50/40",
    sticky: "bg-orange-50/40",
  },
  process: {
    header: "bg-emerald-100/60 text-emerald-900",
    cell: "bg-emerald-50/30",
    sticky: "bg-emerald-50/30",
  },
  forecast: {
    header: "bg-amber-100/60 text-amber-900",
    cell: "bg-amber-50/40",
    sticky: "bg-amber-50/40",
  },
} as const;

/** 日次スケジュールの工程行ごとの識別色 */
export const PROCESS_TYPE_ROW_COLORS: Record<ProcessColumnName, ProcessRowColorSet> = {
  組立前: {
    label: "font-medium text-sky-900",
    cell: "bg-sky-50/90",
    plannedCell: "bg-sky-50/90",
    sticky: "bg-sky-50/95 border-l-[4px] border-l-sky-500",
    plannedSticky: "bg-sky-50/95 border-l-[4px] border-l-sky-500",
  },
  組立: {
    label: "font-medium text-emerald-900",
    cell: "bg-emerald-50/90",
    plannedCell: "bg-emerald-50/90",
    sticky: "bg-emerald-50/95 border-l-[4px] border-l-emerald-500",
    plannedSticky: "bg-emerald-50/95 border-l-[4px] border-l-emerald-500",
  },
  溶接: {
    label: "font-medium text-orange-900",
    cell: "bg-orange-50/90",
    plannedCell: "bg-orange-50/90",
    sticky: "bg-orange-50/95 border-l-[4px] border-l-orange-500",
    plannedSticky: "bg-orange-50/95 border-l-[4px] border-l-orange-500",
  },
  歪取り: {
    label: "font-medium text-violet-900",
    cell: "bg-violet-50/90",
    plannedCell: "bg-violet-50/90",
    sticky: "bg-violet-50/95 border-l-[4px] border-l-violet-500",
    plannedSticky: "bg-violet-50/95 border-l-[4px] border-l-violet-500",
  },
  塗装: {
    label: "font-medium text-cyan-900",
    cell: "bg-cyan-50/90",
    plannedCell: "bg-cyan-50/90",
    sticky: "bg-cyan-50/95 border-l-[4px] border-l-cyan-600",
    plannedSticky: "bg-cyan-50/95 border-l-[4px] border-l-cyan-600",
  },
  仕上げ: {
    label: "font-medium text-rose-900",
    cell: "bg-rose-50/90",
    plannedCell: "bg-rose-50/90",
    sticky: "bg-rose-50/95 border-l-[4px] border-l-rose-500",
    plannedSticky: "bg-rose-50/95 border-l-[4px] border-l-rose-500",
  },
};

const PROCESS_NAME_ALIASES: Record<string, ProcessColumnName> = {
  歪取: "歪取り",
};

export function resolveProcessColumnName(name: string): ProcessColumnName | null {
  if ((PROCESS_COLUMNS as readonly string[]).includes(name)) {
    return name as ProcessColumnName;
  }
  return PROCESS_NAME_ALIASES[name] ?? null;
}

/** 班別ビュー日次スケジュールの工程行色 */
export function getProcessRowColors(processTypeName: string): ProcessRowColorSet {
  const key = resolveProcessColumnName(processTypeName);
  if (key) return PROCESS_TYPE_ROW_COLORS[key];
  return {
    label: "font-medium text-text",
    cell: PROCESS_SECTION_COLORS.process.cell,
    plannedCell: PROCESS_SECTION_COLORS.process.cell,
    sticky: PROCESS_SECTION_COLORS.process.sticky,
    plannedSticky: PROCESS_SECTION_COLORS.process.sticky,
  };
}

export function listProcessTypeLegend(): { name: ProcessColumnName; colors: ProcessRowColorSet }[] {
  return PROCESS_COLUMNS.map((name) => ({
    name,
    colors: PROCESS_TYPE_ROW_COLORS[name],
  }));
}
