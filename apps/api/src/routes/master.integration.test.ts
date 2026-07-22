import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { devAuthHeaders } from "../test/dev-auth.js";
import { resetPrismaMock } from "../test/prisma-mock.js";
import { getTestApp } from "../test/app.js";

vi.mock("../services/master.service.js", () => ({
  listProductTypes: vi.fn(),
  createProductType: vi.fn(),
  updateProductType: vi.fn(),
  deleteProductType: vi.fn(),
  listProcessTypes: vi.fn(),
  updateProcessType: vi.fn(),
  listTeams: vi.fn(),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  listTeamMembers: vi.fn(),
  createTeamMember: vi.fn(),
  updateTeamMember: vi.fn(),
  deleteTeamMember: vi.fn(),
  listCalendar: vi.fn(),
  upsertCalendar: vi.fn(),
  getCapacitySettings: vi.fn(),
  updateCapacitySettings: vi.fn(),
}));

import * as masterSvc from "../services/master.service.js";

const app = getTestApp();

describe("master HTTP", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
  });

  it("GET /v1/product-types returns 401 without auth", async () => {
    const res = await request(app).get("/v1/product-types");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("GET /v1/product-types returns list for admin dev auth", async () => {
    vi.mocked(masterSvc.listProductTypes).mockResolvedValue([
      { id: "ptype-i", name: "I型", category: "kyotai", sortOrder: 1 },
    ]);

    const res = await request(app)
      .get("/v1/product-types")
      .set(devAuthHeaders("dev-user"));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(masterSvc.listProductTypes).toHaveBeenCalled();
  });

  it("POST /v1/product-types returns 403 for operator role", async () => {
    const res = await request(app)
      .post("/v1/product-types")
      .set(devAuthHeaders("dev-operator"))
      .send({ name: "New type", category: "kyotai" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
    expect(masterSvc.createProductType).not.toHaveBeenCalled();
  });

  it("GET /v1/teams returns list for admin dev auth", async () => {
    vi.mocked(masterSvc.listTeams).mockResolvedValue([
      { id: "team-nakano", name: "中野班", sortOrder: 1 },
    ]);

    const res = await request(app)
      .get("/v1/teams")
      .set(devAuthHeaders("dev-user"));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(masterSvc.listTeams).toHaveBeenCalled();
  });
});
