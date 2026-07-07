export type ScheduleTableSize = "normal" | "expanded";

export function getScheduleTableStyles(size: ScheduleTableSize) {
  if (size === "expanded") {
    return {
      table: "w-full min-w-[1100px] text-base",
      thead: "text-sm",
      metricCell: "px-3 py-2",
      processSticky: "px-3 py-2",
      dateTh: "min-w-[52px] px-1 py-2",
      hint: "text-sm",
      hintSub: "text-xs",
      headerBar: "text-base",
    };
  }

  return {
    table: "w-full min-w-[900px] text-[12px]",
    thead: "text-[11px]",
    metricCell: "px-2 py-1",
    processSticky: "px-2 py-1",
    dateTh: "min-w-[36px] px-0.5 py-1",
    hint: "text-[11px]",
    hintSub: "text-[10px]",
    headerBar: "text-[13px]",
  };
}
