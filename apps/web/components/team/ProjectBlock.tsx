"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import type { TeamScheduleProjectDto } from "@logivoice/shared";
import { PROJECT_STATUS_LABELS } from "@logivoice/shared";
import { getScheduleTableStyles } from "@/lib/schedule-table-size";
import type { ScheduleCellUpdate } from "@/lib/schedule-grid-clipboard";
import { ProjectScheduleTable } from "./ProjectScheduleTable";

type Props = {
  teamId: string;
  project: TeamScheduleProjectDto;
  dates: string[];
  holidays: Record<string, boolean>;
  today?: string;
  dayCellWidth?: number;
  showMonthHeaders?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onSaveCell: (
    projectId: string,
    processTypeId: string,
    date: string,
    hours: number,
    recordType?: "planned" | "actual",
  ) => void;
  onBulkSave: (
    projectId: string,
    updates: ScheduleCellUpdate[],
  ) => Promise<boolean>;
  anchorId?: string;
  actualReadOnly?: boolean;
  onUndo?: () => void;
};

function ProjectHeader({
  project,
  headerBarClass,
  action,
}: {
  project: TeamScheduleProjectDto;
  headerBarClass: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border bg-bg px-3 py-2">
      <div className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 ${headerBarClass}`}>
        <span className="font-semibold">{project.projectNumber}</span>
        <span>{project.projectName}</span>
        {project.deadline && (
          <span className="text-muted">納期: {project.deadline}</span>
        )}
        <span className="text-muted">
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
        {project.clientName && (
          <span className="text-muted">客先: {project.clientName}</span>
        )}
        {project.weight != null && (
          <span className="text-muted">重量: {project.weight}t</span>
        )}
        {project.setCount != null && (
          <span className="text-muted">SET: {project.setCount}</span>
        )}
      </div>
      {action}
    </div>
  );
}

export function ProjectBlock({
  teamId: _teamId,
  project,
  dates,
  holidays,
  today,
  dayCellWidth,
  showMonthHeaders = false,
  scrollRef,
  onSaveCell,
  onBulkSave,
  anchorId,
  actualReadOnly = false,
  onUndo,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const expandedScrollRef = useRef<HTMLDivElement>(null);
  const normalStyles = getScheduleTableStyles("normal");
  const expandedStyles = getScheduleTableStyles("expanded");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded || !today) return;
    const month = today.slice(0, 7);
    const hasCurrentMonth = dates.some((d) => d.startsWith(month));
    if (!hasCurrentMonth) return;

    const timer = window.setTimeout(() => {
      const container = expandedScrollRef.current;
      if (!container) return;
      const target = container.querySelector<HTMLElement>(`[data-date="${today}"]`);
      if (!target) return;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset =
        targetRect.left -
        containerRect.left -
        container.clientWidth / 2 +
        targetRect.width / 2;
      container.scrollTo({ left: container.scrollLeft + offset, behavior: "smooth" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [isExpanded, today, dates]);

  const expandButton = (
    <button
      type="button"
      onClick={() => setIsExpanded(true)}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-[12px] text-muted transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
      aria-label="表を拡大"
      title="表を拡大"
    >
      <Maximize2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">拡大</span>
    </button>
  );

  const overlay =
    isExpanded && mounted
      ? createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-white">
            <ProjectHeader
              project={project}
              headerBarClass={expandedStyles.headerBar}
              action={
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-sm text-muted transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  aria-label="拡大を閉じる"
                >
                  <X className="h-4 w-4" />
                  閉じる
                </button>
              }
            />
            <div className="flex-1 overflow-auto p-4">
              <ProjectScheduleTable
                project={project}
                dates={dates}
                holidays={holidays}
                today={today}
                size="expanded"
                showMonthHeaders={showMonthHeaders}
                scrollRef={expandedScrollRef}
                onSaveCell={onSaveCell}
                onBulkSave={onBulkSave}
                actualReadOnly={actualReadOnly}
                onUndo={onUndo}
              />
            </div>
            <p className="border-t border-border px-4 py-2 text-center text-[12px] text-muted">
              Esc キーでも閉じられます
            </p>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        id={anchorId}
        className="mb-4 scroll-mt-4 rounded-lg border border-border bg-white"
      >
        <ProjectHeader
          project={project}
          headerBarClass={normalStyles.headerBar}
          action={expandButton}
        />
        {!isExpanded && (
          <ProjectScheduleTable
              project={project}
              dates={dates}
              holidays={holidays}
              today={today}
              size="normal"
              dayCellWidth={dayCellWidth}
              showMonthHeaders={showMonthHeaders}
              scrollRef={scrollRef}
              onSaveCell={onSaveCell}
              onBulkSave={onBulkSave}
              actualReadOnly={actualReadOnly}
              onUndo={onUndo}
          />
        )}
      </div>
      {overlay}
    </>
  );
}
