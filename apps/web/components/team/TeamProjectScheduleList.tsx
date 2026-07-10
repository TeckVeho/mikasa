"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import type { TeamScheduleDto, TeamScheduleProjectDto } from "@logivoice/shared";
import { ProjectScheduleTable } from "@/components/team/ProjectScheduleTable";
import { ProjectSummaryRow } from "@/components/team/ProjectSummaryRow";
import { ScheduleTableHeader } from "@/components/team/ScheduleTableHeader";
import { useTeamSummaryGrid } from "@/hooks/useTeamSummaryGrid";
import type { ScheduleCellUpdate } from "@/lib/schedule-grid-clipboard";
import {
  computeTeamSummaryTotals,
  readExpandedProjectIds,
  storeExpandedProjectIds,
} from "@/lib/project-schedule-summary";
import { SCHEDULE_SUMMARY_STICKY_WIDTH } from "@/lib/schedule-display";
import { TeamSummaryTotalRow } from "@/components/team/TeamSummaryTotalRow";
import {
  getScheduleTableStyles,
  SCHEDULE_GRID_BORDER,
} from "@/lib/schedule-table-size";
import { cn } from "@/lib/utils";

type SaveCellFn = (
  teamId: string,
  projectId: string,
  processTypeId: string,
  date: string,
  hours: number,
  recordType?: "planned" | "actual",
) => void;

type BulkSaveFn = (
  teamId: string,
  projectId: string,
  updates: ScheduleCellUpdate[],
) => Promise<boolean>;

type ProjectEntry = {
  teamId: string;
  project: TeamScheduleProjectDto;
};

type Props = {
  schedules: TeamScheduleDto[];
  dates: string[];
  holidays: Record<string, boolean>;
  today: string;
  dayCellWidth?: number;
  showMonthHeaders: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onSaveCell: SaveCellFn;
  onBulkSave: BulkSaveFn;
  onUndo: () => void;
  showControls?: boolean;
};

function collectProjects(schedules: TeamScheduleDto[]): ProjectEntry[] {
  const entries: ProjectEntry[] = [];
  for (const schedule of schedules) {
    for (const project of schedule.projects) {
      entries.push({ teamId: schedule.teamId, project });
    }
  }
  return entries;
}

function ExpandedProjectOverlay({
  entry,
  dates,
  holidays,
  today,
  showMonthHeaders,
  onClose,
  onSaveCell,
  onBulkSave,
  onUndo,
}: {
  entry: ProjectEntry;
  dates: string[];
  holidays: Record<string, boolean>;
  today: string;
  showMonthHeaders: boolean;
  onClose: () => void;
  onSaveCell: SaveCellFn;
  onBulkSave: BulkSaveFn;
  onUndo: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const styles = getScheduleTableStyles("expanded");
  const { project, teamId } = entry;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const month = today.slice(0, 7);
    const hasCurrentMonth = dates.some((d) => d.startsWith(month));
    if (!hasCurrentMonth) return;

    const timer = window.setTimeout(() => {
      const container = scrollRef.current;
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
  }, [today, dates]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-bg px-4 py-2">
        <div className={cn("flex flex-wrap items-baseline gap-x-4 gap-y-1", styles.headerBar)}>
          <span className="font-semibold">{project.projectNumber}</span>
          <span>{project.projectName}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-sm text-muted transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          aria-label="拡大を閉じる"
        >
          <X className="h-4 w-4" />
          閉じる
        </button>
      </div>
      <div ref={scrollRef} className="team-schedule-scroll flex-1 overflow-auto p-4">
        <ProjectScheduleTable
          project={project}
          dates={dates}
          holidays={holidays}
          today={today}
          size="expanded"
          showMonthHeaders={showMonthHeaders}
          onSaveCell={(projectId, processTypeId, date, hours, recordType) =>
            onSaveCell(teamId, projectId, processTypeId, date, hours, recordType)
          }
          onBulkSave={(projectId, updates) =>
            onBulkSave(teamId, projectId, updates)
          }
          onUndo={onUndo}
        />
      </div>
      <p className="border-t border-border px-4 py-2 text-center text-[12px] text-muted">
        Esc キーでも閉じられます
      </p>
    </div>,
    document.body,
  );
}

export function TeamProjectScheduleList({
  schedules,
  dates,
  holidays,
  today,
  dayCellWidth,
  showMonthHeaders,
  scrollRef,
  onSaveCell,
  onBulkSave,
  onUndo,
  showControls = true,
}: Props) {
  const projects = collectProjects(schedules);
  const tableRootRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [fullscreenProjectId, setFullscreenProjectId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const styles = getScheduleTableStyles("normal");
  const colSpan = 5 + dates.length;

  useEffect(() => {
    setExpandedIds(readExpandedProjectIds());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#project-")) return;
    const projectId = hash.slice("#project-".length);
    if (!projectId || !projects.some((p) => p.project.projectId === projectId)) {
      return;
    }
    setExpandedIds((prev) => {
      if (prev.has(projectId)) return prev;
      const next = new Set(prev);
      next.add(projectId);
      storeExpandedProjectIds(next);
      return next;
    });
    const timer = window.setTimeout(() => {
      document.getElementById(`project-${projectId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [hydrated, projects]);

  const persistExpanded = useCallback((next: Set<string>) => {
    setExpandedIds(next);
    storeExpandedProjectIds(next);
  }, []);

  const toggleProject = useCallback(
    (projectId: string) => {
      const next = new Set(expandedIds);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      persistExpanded(next);
    },
    [expandedIds, persistExpanded],
  );

  const expandAll = useCallback(() => {
    persistExpanded(new Set(projects.map((p) => p.project.projectId)));
  }, [persistExpanded, projects]);

  const collapseAll = useCallback(() => {
    persistExpanded(new Set());
  }, [persistExpanded]);

  const fullscreenEntry =
    fullscreenProjectId != null
      ? projects.find((p) => p.project.projectId === fullscreenProjectId) ?? null
      : null;

  const summaryGrid = useTeamSummaryGrid({
    projects,
    dates,
    holidays,
    tableRootRef,
    onSaveCell: (teamId, projectId, processTypeId, date, hours, recordType) =>
      onSaveCell(teamId, projectId, processTypeId, date, hours, recordType),
    onBulkSave: (teamId, projectId, updates) =>
      onBulkSave(teamId, projectId, updates),
    onUndo,
  });

  const teamTotals = computeTeamSummaryTotals(
    projects.map((p) => p.project),
    dates,
  );

  return (
    <>
      {showControls && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={expandAll}
            className="rounded border border-border px-2 py-1 text-muted transition-colors hover:border-primary/40 hover:text-primary"
          >
            すべて展開
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded border border-border px-2 py-1 text-muted transition-colors hover:border-primary/40 hover:text-primary"
          >
            すべて折りたたむ
          </button>
          <span className="text-muted">
            行左端をクリックで内訳表示。矢印キーで工事間を移動できます
          </span>
        </div>
      )}

      <div
        ref={(el) => {
          tableRootRef.current = el;
          if (scrollRef && "current" in scrollRef) {
            (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current =
              el;
          }
        }}
        className="team-schedule-scroll overflow-x-auto rounded-lg border border-border bg-white"
      >
        <table
          className={cn(styles.table, "w-full border-collapse")}
          style={
            dayCellWidth != null
              ? { minWidth: SCHEDULE_SUMMARY_STICKY_WIDTH + dayCellWidth * dates.length }
              : undefined
          }
        >
          <ScheduleTableHeader
            dates={dates}
            holidays={holidays}
            today={today}
            dayCellWidth={dayCellWidth}
            showMonthHeaders={showMonthHeaders}
            stickyLabel="工事"
            showRowKindColumn
          />
          <tbody>
            {projects.map(({ teamId, project }, projectIndex) => {
              const isExpanded =
                hydrated && expandedIds.has(project.projectId);

              return (
                <Fragment key={project.projectId}>
                  <ProjectSummaryRow
                    project={project}
                    dates={dates}
                    holidays={holidays}
                    today={today}
                    dayCellWidth={dayCellWidth}
                    showMonthHeaders={showMonthHeaders}
                    isExpanded={isExpanded}
                    gridProjectIndex={projectIndex}
                    grid={summaryGrid}
                    onToggle={() => toggleProject(project.projectId)}
                  />
                  {isExpanded && (
                    <tr id={`project-${project.projectId}`} className="scroll-mt-4">
                      <td colSpan={colSpan} className={cn("p-0", SCHEDULE_GRID_BORDER)}>
                        <div className="border-t border-border/60 bg-bg/30">
                          <div className="flex justify-end px-2 py-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFullscreenProjectId(project.projectId);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                              aria-label="表を拡大"
                            >
                              <Maximize2 className="h-3 w-3" />
                              拡大
                            </button>
                          </div>
                          <ProjectScheduleTable
                            project={project}
                            dates={dates}
                            holidays={holidays}
                            today={today}
                            size="normal"
                            dayCellWidth={dayCellWidth}
                            showMonthHeaders={showMonthHeaders}
                            hideHeader
                            onSaveCell={(
                              projectId,
                              processTypeId,
                              date,
                              hours,
                              recordType,
                            ) =>
                              onSaveCell(
                                teamId,
                                projectId,
                                processTypeId,
                                date,
                                hours,
                                recordType,
                              )
                            }
                            onBulkSave={(projectId, updates) =>
                              onBulkSave(teamId, projectId, updates)
                            }
                            onUndo={onUndo}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {projects.length > 0 && (
              <TeamSummaryTotalRow
                totals={teamTotals}
                dates={dates}
                holidays={holidays}
                today={today}
                dayCellWidth={dayCellWidth}
                showMonthHeaders={showMonthHeaders}
              />
            )}
          </tbody>
        </table>
      </div>

      {fullscreenEntry && (
        <ExpandedProjectOverlay
          entry={fullscreenEntry}
          dates={dates}
          holidays={holidays}
          today={today}
          showMonthHeaders={showMonthHeaders}
          onClose={() => setFullscreenProjectId(null)}
          onSaveCell={onSaveCell}
          onBulkSave={onBulkSave}
          onUndo={onUndo}
        />
      )}
    </>
  );
}
