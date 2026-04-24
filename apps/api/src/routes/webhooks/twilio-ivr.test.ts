import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

const prisma = new PrismaClient();
const app = createApp();

const tenantId = ulid();
const phoneId = ulid();
const scenarioAId = ulid();
const scenarioBId = ulid();
const scenarioCId = ulid();
const phoneNumber = "+815099990001";

const minimalFlow = {
  nodes: [
    { id: "n1", type: "speak", data: { text: "test", speed: 1 }, position: { x: 0, y: 0 } },
    { id: "n2", type: "end", data: {}, position: { x: 0, y: 120 } },
  ],
  edges: [{ id: "e1", source: "n1", target: "n2" }],
};

beforeAll(async () => {
  await prisma.tenant.create({
    data: { id: tenantId, name: "IVR Test Tenant" },
  });

  for (const [id, name] of [
    [scenarioAId, "配送テスト"],
    [scenarioBId, "請求テスト"],
    [scenarioCId, "総合テスト"],
  ] as const) {
    await prisma.scenario.create({
      data: { id, tenantId, name, flowJson: minimalFlow, status: "published", publishedAt: new Date() },
    });
    await prisma.geminiScenario.create({
      data: {
        scenarioId: id,
        persona: `テスト用ペルソナ: ${name}`,
        conversationRules: "テスト用ルール",
        businessKnowledge: "テスト用ナレッジ",
        guardRails: "テスト用ガードレール",
      },
    });
  }

  await prisma.phoneNumber.create({
    data: {
      id: phoneId,
      tenantId,
      scenarioId: scenarioCId,
      number: phoneNumber,
      twilioNumberSid: `PNTEST_IVR_${ulid()}`,
      status: "active",
      ivrEnabled: true,
      ivrMessage: "配送は1、請求は2、その他は3を押してください。",
    },
  });

  await prisma.ivrRoute.createMany({
    data: [
      { phoneNumberId: phoneId, digit: "1", label: "配送", scenarioId: scenarioAId, sortOrder: 0 },
      { phoneNumberId: phoneId, digit: "2", label: "請求", scenarioId: scenarioBId, sortOrder: 1 },
      { phoneNumberId: phoneId, digit: "3", label: "総合", scenarioId: scenarioCId, sortOrder: 2 },
    ],
  });
});

afterAll(async () => {
  await prisma.ivrRoute.deleteMany({ where: { phoneNumberId: phoneId } });
  await prisma.phoneNumber.deleteMany({ where: { tenantId } });
  await prisma.geminiScenario.deleteMany({
    where: { scenarioId: { in: [scenarioAId, scenarioBId, scenarioCId] } },
  });
  await prisma.scenario.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("POST /webhooks/twilio/voice — IVR branching", () => {
  it("returns <Gather> TwiML when IVR is enabled", async () => {
    const res = await request(app)
      .post("/webhooks/twilio/voice")
      .type("form")
      .send({ To: phoneNumber, From: "+819000000000" });

    expect(res.status).toBe(200);
    expect(res.type).toBe("text/xml");
    expect(res.text).toContain("<Gather");
    expect(res.text).toContain("numDigits=");
    expect(res.text).toContain("ivr-route");
    expect(res.text).toContain("配送は1");
  });

  it("returns <Connect><Stream> for non-IVR numbers", async () => {
    const res = await request(app)
      .post("/webhooks/twilio/voice")
      .type("form")
      .send({ To: "+819999999999", From: "+819000000000" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("<Connect>");
    expect(res.text).toContain("<Stream");
    expect(res.text).not.toContain("<Gather");
  });

  it("includes retry <Gather> in IVR TwiML", async () => {
    const res = await request(app)
      .post("/webhooks/twilio/voice")
      .type("form")
      .send({ To: phoneNumber, From: "+819000000000" });

    const gatherCount = (res.text.match(/<Gather/g) ?? []).length;
    expect(gatherCount).toBe(2);
    expect(res.text).toContain("もう一度ご案内いたします");
  });
});

describe("POST /webhooks/twilio/ivr-route — digit routing", () => {
  it("routes digit 1 to delivery scenario", async () => {
    const res = await request(app)
      .post(`/webhooks/twilio/ivr-route?called=${encodeURIComponent(phoneNumber)}&from=%2B819000000000`)
      .type("form")
      .send({ Digits: "1" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("<Connect>");
    expect(res.text).toContain("<Stream");
    expect(res.text).toContain(`scenarioId`);
    expect(res.text).toContain(scenarioAId);
  });

  it("routes digit 2 to billing scenario", async () => {
    const res = await request(app)
      .post(`/webhooks/twilio/ivr-route?called=${encodeURIComponent(phoneNumber)}&from=%2B819000000000`)
      .type("form")
      .send({ Digits: "2" });

    expect(res.status).toBe(200);
    expect(res.text).toContain(scenarioBId);
  });

  it("falls back to default scenario for unknown digit", async () => {
    const res = await request(app)
      .post(`/webhooks/twilio/ivr-route?called=${encodeURIComponent(phoneNumber)}&from=%2B819000000000`)
      .type("form")
      .send({ Digits: "9" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("<Connect>");
    expect(res.text).toContain(scenarioCId);
  });
});
