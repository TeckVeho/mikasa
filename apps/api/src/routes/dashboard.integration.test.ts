import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { devAuthHeaders } from "../test/dev-auth.js";
import { resetPrismaMock } from "../test/prisma-mock.js";
import { getTestApp } from "../test/app.js";

vi.mock("../services/dashboard.service.js", () => ({
  getDashboardSummary: vi.fn(),
  getTeamDashboard: vi.fn(),
}));

vi.mock("../services/daily-record.service.js", () => ({
  listDailyRecords: vi.fn(),
  upsertDailyRecords: vi.fn(),
  importDailyRecordsFromCsv: vi.fn(),
}));

import * as dashboardSvc from "../services/dashboard.service.js";
import * as dailySvc from "../services/daily-record.service.js";

const app = getTestApp();

describe("dashboard HTTP", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
  });

  it("GET /v1/dashboard/summary returns 401 without auth", async () => {
    const res = await request(app).get("/v1/dashboard/summary");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("GET /v1/dashboard/summary returns data for admin dev auth", async () => {
    vi.mocked(dashboardSvc.getDashboardSummary).mockResolvedValue({
      projectCount: 5,
      teamCount: 3,
    });

    const res = await request(app)
      .get("/v1/dashboard/summary")
      .set(devAuthHeaders("dev-user"));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.projectCount).toBe(5);
    expect(dashboardSvc.getDashboardSummary).toHaveBeenCalled();
  });

  it("POST /v1/daily-records accepts operator dev auth", async () => {
    vi.mocked(dailySvc.upsertDailyRecords).mockResolvedValue({
      ok: true,
      data: { count: 0 },
    });

    const res = await request(app)
      .post("/v1/daily-records")
      .set(devAuthHeaders("dev-operator"))
      .send({ records: [] });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(dailySvc.upsertDailyRecords).toHaveBeenCalled();
  });
});
