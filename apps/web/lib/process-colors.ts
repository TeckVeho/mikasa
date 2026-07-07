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
  sticky: string;
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
    cell: "bg-sky-50/70",
    sticky: "bg-sky-50/90 border-l-[3px] border-l-sky-400",
  },
  組立: {
    label: "font-medium text-emerald-900",
    cell: "bg-emerald-50/70",
    sticky: "bg-emerald-50/90 border-l-[3px] border-l-emerald-400",
  },
  溶接: {
    label: "font-medium text-orange-900",
    cell: "bg-orange-50/70",
    sticky: "bg-orange-50/90 border-l-[3px] border-l-orange-400",
  },
  歪取り: {
    label: "font-medium text-violet-900",
    cell: "bg-violet-50/70",
    sticky: "bg-violet-50/90 border-l-[3px] border-l-violet-400",
  },
  塗装: {
    label: "font-medium text-cyan-900",
    cell: "bg-cyan-50/70",
    sticky: "bg-cyan-50/90 border-l-[3px] border-l-cyan-500",
  },
  仕上げ: {
    label: "font-medium text-rose-900",
    cell: "bg-rose-50/70",
    sticky: "bg-rose-50/90 border-l-[3px] border-l-rose-400",
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
    sticky: PROCESS_SECTION_COLORS.process.sticky,
  };
}

export function listProcessTypeLegend(): { name: ProcessColumnName; colors: ProcessRowColorSet }[] {
  return PROCESS_COLUMNS.map((name) => ({
    name,
    colors: PROCESS_TYPE_ROW_COLORS[name],
  }));
}
