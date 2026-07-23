import { describe, expect, it } from "vitest";
import request from "supertest";
import { getTestApp } from "../test/app.js";

const app = getTestApp();

describe("health HTTP", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("GET / returns API metadata as JSON", async () => {
    const res = await request(app).get("/").set("Accept", "application/json");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.apiBase).toBe("/v1");
  });
});
