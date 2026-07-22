import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { devAuthHeaders } from "../test/dev-auth.js";
import { adminUser } from "../test/fixtures.js";
import { resetPrismaMock } from "../test/prisma-mock.js";
import { getTestApp } from "../test/app.js";

const app = getTestApp();

describe("auth HTTP", () => {
  beforeEach(() => {
    resetPrismaMock();
    vi.clearAllMocks();
  });

  it("POST /v1/auth/verify returns 422 without token", async () => {
    const res = await request(app).post("/v1/auth/verify").send({});
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("GET /v1/auth/me returns 401 without auth", async () => {
    const res = await request(app).get("/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("GET /v1/auth/me returns user with dev auth headers", async () => {
    const res = await request(app)
      .get("/v1/auth/me")
      .set(devAuthHeaders("dev-user"));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toMatchObject({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      tenantId: adminUser.tenantId,
    });
  });

  it("GET /v1/auth/me returns 403 when tenant id does not match", async () => {
    const res = await request(app)
      .get("/v1/auth/me")
      .set({
        ...devAuthHeaders("dev-user"),
        "x-dev-tenant-id": "wrong-tenant-id",
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
    expect(res.body.message).toContain("テナントID");
  });
});
