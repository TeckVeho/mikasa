export type ProductCategory = "shinshuku" | "shinshuku_gai" | "kyotai";

export type ProjectStatus =
  | "pending"
  | "drawing_wait"
  | "in_progress"
  | "shipping_wait"
  | "shipped"
  | "completed";

export type ProductTypeDto = {
  id: string;
  name: string;
  category: ProductCategory;
  sortOrder: number;
  regressionA: number | null;
  regressionB: number | null;
  processRatios: Record<string, number> | null;
  hasModelConfig: boolean;
};

export type ProcessTypeDto = {
  id: string;
  name: string;
  displayOrder: number;
  defaultRatio: number;
  isWelding: boolean;
};

export type TeamDto = {
  id: string;
  name: string;
  sortOrder: number;
  memberCount?: number;
};

export type TeamMemberDto = {
  id: string;
  teamId: string;
  name: string;
  userId: string | null;
};

export type CalendarDayDto = {
  date: string;
  isHoliday: boolean;
  holidayName: string | null;
};

export type CapacitySettingDto = {
  id: string;
  teamId: string | null;
  category: string;
  regularHoursPerDay: number;
  overtime2hPerDay: number;
  overtime4hPerDay: number;
  headcount: number;
};

export type ProjectDto = {
  id: string;
  projectNumber: string;
  clientName: string | null;
  projectName: string;
  productTypeId: string | null;
  productTypeName?: string | null;
  deadline: string | null;
  weight: number | null;
  memberLength: number | null;
  drawingReceivedAt: string | null;
  plannedHours: number | null;
  weldingRatio: number | null;
  teamId: string | null;
  teamName?: string | null;
  status: ProjectStatus;
  category: ProductCategory | null;
  setCount: number | null;
  detail: string | null;
  pastAverageHours: number | null;
  progressRate?: number;
  variance?: number;
};

export type ProjectListItemDto = ProjectDto & {
  totalActualHours: number;
  forgingTarget: number;
  forgingActual: number;
  forgingVariance: number;
  weldingTarget: number;
  weldingActual: number;
  weldingVariance: number;
  processSummary: Record<string, number>;
  forecastHours: number | null;
  forecastVariance: number | null;
};

export type ProcessRecordDto = {
  id: string;
  projectId: string;
  processTypeId: string;
  processTypeName?: string;
  date: string;
  hours: number;
};

export type ProcessProgressDto = {
  processTypeId: string;
  processTypeName: string;
  targetHours: number;
  actualHours: number;
  progressRate: number;
};

export type ProjectProgressDto = {
  projectId: string;
  plannedHours: number;
  actualHours: number;
  progressRate: number;
  variance: number;
  forecastHours: number | null;
  forecastVariance: number | null;
  forgingTarget: number;
  forgingActual: number;
  weldingTarget: number;
  weldingActual: number;
  processProgress: ProcessProgressDto[];
};

/** category = 鍛冶/溶接/その他（泉北工程・日別予想作業時間） */
export type LoadChartView = "category" | "process" | "team";

export type LoadChartSeriesDto = {
  key: string;
  label: string;
  values: number[];
};

export type LoadChartDto = {
  dates: string[];
  view: LoadChartView;
  series: LoadChartSeriesDto[];
  paceLines: { label: string; value: number }[];
};

export type DashboardSummaryDto = {
  activeProjectCount: number;
  delayedProjectCount: number;
  averageProgressRate: number;
  monthlyLoadRate: number;
};

export type AlertDto = {
  type: "deadline_risk" | "capacity_exceeded";
  projectId?: string;
  projectNumber?: string;
  message: string;
  severity: "warning" | "critical";
};

export type TeamScheduleProcessRowDto = {
  processTypeId: string;
  processTypeName: string;
  targetHours: number;
  actualHours: number;
  progressRate: number;
  dailyHours: Record<string, number>;
};

export type TeamScheduleProjectDto = {
  projectId: string;
  projectNumber: string;
  projectName: string;
  deadline: string | null;
  status: ProjectStatus;
  clientName: string | null;
  weight: number | null;
  setCount: number | null;
  detail: string | null;
  plannedHours: number;
  pastAverageHours: number | null;
  totalActualHours: number;
  totalProgressRate: number;
  processes: TeamScheduleProcessRowDto[];
};

export type TeamScheduleDto = {
  teamId: string;
  teamName: string;
  /** 起点月 (YYYY-MM) */
  month: string;
  /** 表示月数 (1〜3) */
  months: number;
  dates: string[];
  holidays: Record<string, boolean>;
  projects: TeamScheduleProjectDto[];
};

export type HistoricalAverageDto = {
  id: string;
  productTypeId: string;
  productTypeName: string;
  projectNumber: string;
  clientName: string | null;
  bridgeName: string | null;
  completedAt: string | null;
  teamId: string;
  teamName: string;
  manufacturingPlanned: number | null;
  salesPlanned: number | null;
  weight: number | null;
  assemblyPrepHours: number | null;
  assemblyHours: number | null;
  weldingHours: number | null;
  distortionHours: number | null;
  paintingHours: number | null;
  finishingHours: number | null;
  totalHours: number | null;
  projectCount: number | null;
  memberLength: number | null;
  weightPerMeter: number | null;
  actualHours: number;
  manufacturingRatio: number | null;
  salesRatio: number | null;
  processBreakdown: {
    name: string;
    hours: number;
    sharePercent: number;
  }[];
};

export type HistoricalTeamSummaryDto = {
  recordCount: number;
  manufacturingPlanned: number | null;
  salesPlanned: number | null;
  weight: number | null;
  assemblyPrepHours: number | null;
  assemblyHours: number | null;
  weldingHours: number | null;
  distortionHours: number | null;
  paintingHours: number | null;
  finishingHours: number | null;
  totalHours: number | null;
  actualHours: number | null;
};

export type HistoricalTeamGroupDto = {
  teamId: string;
  teamName: string;
  sortOrder: number;
  records: HistoricalAverageDto[];
  summary: HistoricalTeamSummaryDto;
};

export type HistoricalAverageLookupDto = {
  totalHours: number;
  manufacturingPlanned: number | null;
  salesPlanned: number | null;
};

export type ModelRegressionSampleDto = {
  id: string;
  productTypeName: string;
  projectNumber: string;
  bridgeName: string | null;
  teamName: string;
  weight: number;
  memberLength: number;
  totalHours: number;
};

export type ProjectModelPreviewDto = {
  weight: number;
  memberLength: number;
  pastAverageHours: number;
  plannedHours: number;
  weldingRatio: number;
  regressionA: number;
  regressionB: number;
  sampleCount: number;
  regressionSamples: ModelRegressionSampleDto[];
  processTargets: {
    processName: string;
    ratio: number;
    targetHours: number;
  }[];
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  shinshuku: "伸縮",
  shinshuku_gai: "伸縮外",
  kyotai: "橋体",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: "未着手",
  drawing_wait: "出図待ち",
  in_progress: "製作中",
  shipping_wait: "出荷待ち",
  shipped: "出荷",
  completed: "完了",
};
