import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { devAuthHeaders } from "../test/dev-auth.js";
import { resetPrismaMock } from "../test/prisma-mock.js";
import { getTestApp } from "../test/app.js";

vi.mock("../services/project.service.js", () => ({
  listProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  importProjects: vi.fn(),
  parseCsvImport: vi.fn(),
}));

import * as projectSvc from "../services/project.service.js";

const app = getTestApp();

describe("projects HTTP", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
  });

  it("GET /v1/projects returns 401 without auth", async () => {
    const res = await request(app).get("/v1/projects");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("GET /v1/projects returns list for admin dev auth", async () => {
    vi.mocked(projectSvc.listProjects).mockResolvedValue([]);

    const res = await request(app)
      .get("/v1/projects")
      .set(devAuthHeaders("dev-user"));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(projectSvc.listProjects).toHaveBeenCalled();
  });

  it("POST /v1/projects returns 403 for operator role", async () => {
    const res = await request(app)
      .post("/v1/projects")
      .set(devAuthHeaders("dev-operator"))
      .send({ name: "Test project" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
    expect(projectSvc.createProject).not.toHaveBeenCalled();
  });

  it("GET /v1/projects/:id returns 404 when project not found", async () => {
    vi.mocked(projectSvc.getProject).mockResolvedValue(null);

    const res = await request(app)
      .get("/v1/projects/missing-id")
      .set(devAuthHeaders("dev-user"));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });
});
