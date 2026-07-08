import type {
  AlertDto,
  CapacitySettingDto,
  CalendarDayDto,
  DashboardSummaryDto,
  HistoricalAverageDto,
  HistoricalTeamGroupDto,
  HistoricalAverageLookupDto,
  LoadChartDto,
  LoadChartView,
  ProcessTypeDto,
  ProductTypeDto,
  ProjectListItemDto,
  ProjectProgressDto,
  TeamDto,
  TeamMemberDto,
  TeamScheduleDto,
  ProjectModelPreviewDto,
  ScheduleModelDto,
  ScheduleApplyPreviewDto,
  ProcessRecordType,
} from "@logivoice/shared";
import { apiJson } from "./api";

export async function fetchProductTypes() {
  return apiJson<ProductTypeDto[]>("/v1/product-types");
}

export async function fetchProcessTypes() {
  return apiJson<ProcessTypeDto[]>("/v1/process-types");
}

export async function fetchTeams() {
  return apiJson<TeamDto[]>("/v1/teams");
}

export async function fetchCapacitySettings() {
  return apiJson<CapacitySettingDto[]>("/v1/capacity-settings");
}

export async function fetchCalendar(start: string, end: string) {
  return apiJson<CalendarDayDto[]>(`/v1/calendar?start=${start}&end=${end}`);
}

export async function fetchProjects(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params)}` : "";
  return apiJson<ProjectListItemDto[]>(`/v1/projects${qs}`);
}

export async function fetchProject(id: string) {
  return apiJson<ProjectListItemDto>(`/v1/projects/${id}`);
}

export async function createProject(body: Record<string, unknown>) {
  return apiJson<{ id: string }>("/v1/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function previewScheduleApply(
  projectId: string,
  body: { startDate: string; plannedHours: number },
) {
  return apiJson<ScheduleApplyPreviewDto>(`/v1/projects/${projectId}/schedule-preview`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function applyProjectSchedule(projectId: string, body: { startDate: string }) {
  return apiJson<ScheduleApplyPreviewDto>(`/v1/projects/${projectId}/apply-schedule`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchScheduleModel() {
  return apiJson<ScheduleModelDto | null>("/v1/settings/schedule-model");
}

export async function saveScheduleModel(body: {
  totalDays: number;
  dayPatterns: { processTypeId: string; dayOffset: number; hoursRatio: number }[];
}) {
  return apiJson<ScheduleModelDto>("/v1/settings/schedule-model", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function previewScheduleForNewProject(body: {
  startDate: string;
  plannedHours: number;
}) {
  return apiJson<ScheduleApplyPreviewDto>("/v1/settings/schedule-model/preview", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateProject(id: string, body: Record<string, unknown>) {
  return apiJson<{ id: string }>(`/v1/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function previewProjectModel(
  projectId: string,
  body: { weight: number; memberLength: number },
) {
  return apiJson<ProjectModelPreviewDto>(`/v1/projects/${projectId}/model-preview`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function applyProjectModel(
  projectId: string,
  body: { weight: number; memberLength: number; startDate?: string },
) {
  return apiJson<ProjectModelPreviewDto>(`/v1/projects/${projectId}/apply-model`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchLoadChart(params?: {
  start?: string;
  end?: string;
  view?: LoadChartView;
  teamId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  if (params?.view) qs.set("view", params.view);
  if (params?.teamId) qs.set("teamId", params.teamId);
  const q = qs.toString();
  return apiJson<LoadChartDto>(`/v1/dashboard/load-chart${q ? `?${q}` : ""}`);
}

export async function fetchProjectProgress(id: string) {
  return apiJson<ProjectProgressDto>(`/v1/projects/${id}/progress`);
}

export async function fetchDashboardSummary() {
  return apiJson<DashboardSummaryDto>("/v1/dashboard/summary");
}

export async function fetchTeamDashboard(teamId: string) {
  return apiJson<{
    team: { id: string; name: string };
    projects: {
      projectId: string;
      projectNumber: string;
      projectName: string;
      progressRate: number;
      actualHours: number;
      variance: number;
    }[];
  }>(`/v1/dashboard/teams/${teamId}`);
}

export async function fetchTeamSchedule(
  teamId: string,
  month: string,
  months = 1,
) {
  const params = new URLSearchParams({
    month,
    months: String(months),
  });
  return apiJson<TeamScheduleDto>(
    `/v1/dashboard/teams/${teamId}/schedule?${params.toString()}`,
  );
}

export async function moveScheduleRecord(
  teamId: string,
  body: {
    projectId: string;
    processTypeId: string;
    fromDate: string;
    toDate: string;
    hours: number;
    recordType?: ProcessRecordType;
  },
) {
  return apiJson<{ moved: boolean }>(
    `/v1/dashboard/teams/${teamId}/schedule/move`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function saveScheduleCell(
  teamId: string,
  body: {
    projectId: string;
    processTypeId: string;
    date: string;
    hours: number;
    recordType?: ProcessRecordType;
  },
) {
  return apiJson<{ saved: boolean }>(
    `/v1/dashboard/teams/${teamId}/schedule/cell`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function fetchAlerts() {
  return apiJson<AlertDto[]>("/v1/dashboard/alerts");
}

export async function fetchDailyRecords(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return apiJson<
    {
      id: string;
      projectId: string;
      projectNumber: string;
      projectName: string;
      processTypeId: string;
      processTypeName: string;
      date: string;
      hours: number;
    }[]
  >(`/v1/daily-records?${qs}`);
}

export async function saveDailyRecords(
  records: {
    projectId: string;
    processTypeId: string;
    date: string;
    hours: number;
  }[],
) {
  return apiJson<{ count: number }>("/v1/daily-records", {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

export async function fetchHistoricalAverages(productTypeId: string) {
  return apiJson<HistoricalTeamGroupDto[]>(
    `/v1/historical-averages?productTypeId=${encodeURIComponent(productTypeId)}`,
  );
}

export async function fetchAllHistoricalAverages() {
  return apiJson<HistoricalAverageDto[]>("/v1/historical-averages");
}

export async function createHistoricalAverage(body: Record<string, unknown>) {
  return apiJson<{ id: string }>("/v1/historical-averages", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateHistoricalAverage(
  id: string,
  body: Record<string, unknown>,
) {
  return apiJson<{ id: string }>(`/v1/historical-averages/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteHistoricalAverage(id: string) {
  return apiJson<{ id: string }>(`/v1/historical-averages/${id}`, {
    method: "DELETE",
  });
}

export async function lookupHistoricalAverage(
  productTypeId: string,
  teamId: string,
) {
  const qs = new URLSearchParams({ productTypeId, teamId });
  return apiJson<HistoricalAverageLookupDto>(
    `/v1/historical-averages/lookup?${qs}`,
  );
}

export async function importProjectsCsv(csv: string) {
  return apiJson<{ created: number; updated: number; errors: string[] }>(
    "/v1/projects/import",
    { method: "POST", body: JSON.stringify({ csv }) },
  );
}

export async function saveProductType(body: Record<string, unknown>, id?: string) {
  if (id) {
    return apiJson<{ id: string }>(`/v1/product-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
  return apiJson<{ id: string }>("/v1/product-types", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function saveProcessType(id: string, body: Record<string, unknown>) {
  return apiJson<{ id: string }>(`/v1/process-types/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function saveCapacitySetting(body: Record<string, unknown>) {
  return apiJson<{ id: string }>("/v1/capacity-settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function saveCalendarDays(
  days: { date: string; isHoliday: boolean; holidayName?: string | null }[],
) {
  return apiJson<{ count: number }>("/v1/calendar", {
    method: "PUT",
    body: JSON.stringify({ days }),
  });
}

export async function saveTeam(
  body: { name?: string; sortOrder?: number },
  id?: string,
) {
  if (id) {
    return apiJson<{ id: string }>(`/v1/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
  if (!body.name) {
    return { ok: false as const, error: "VALIDATION_ERROR", message: "班名は必須です" };
  }
  return apiJson<{ id: string }>("/v1/teams", {
    method: "POST",
    body: JSON.stringify(body as { name: string; sortOrder?: number }),
  });
}

export async function deleteTeam(id: string) {
  return apiJson<{ id: string }>(`/v1/teams/${id}`, { method: "DELETE" });
}

export async function fetchTeamMembers(teamId: string) {
  return apiJson<TeamMemberDto[]>(`/v1/teams/${teamId}/members`);
}

export async function addTeamMember(teamId: string, body: { name: string }) {
  return apiJson<{ id: string }>(`/v1/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function removeTeamMember(teamId: string, memberId: string) {
  return apiJson<{ id: string }>(`/v1/teams/${teamId}/members/${memberId}`, {
    method: "DELETE",
  });
}

export async function updateTeamMember(teamId: string, memberId: string, body: { name: string }) {
  return apiJson<{ id: string }>(`/v1/teams/${teamId}/members/${memberId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
