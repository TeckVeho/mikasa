import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

const prisma = new PrismaClient();
const app = createApp();

const tenantId = ulid();
const phoneId = ulid();
const scenarioId = ulid();
const ivrPhoneId = ulid();
const ivrScenarioId = ulid();
const phoneNumber = "+815099990101";
const ivrPhoneNumber = "+815099990102";
const humanFirstNumber = "+81312345678";

const minimalFlow = {
  nodes: [
    { id: "n1", type: "speak", data: { text: "test", speed: 1 }, position: { x: 0, y: 0 } },
    { id: "n2", type: "end", data: {}, position: { x: 0, y: 120 } },
  ],
  edges: [{ id: "e1", source: "n1", target: "n2" }],
};

beforeAll(async () => {
  await prisma.tenant.create({
    data: { id: tenantId, name: "Human First Test Tenant" },
  });

  for (const [id, name] of [
    [scenarioId, "人間優先テスト"],
    [ivrScenarioId, "IVR人間優先テスト"],
  ] as const) {
    await prisma.scenario.create({
      data: {
        id,
        tenantId,
        name,
        flowJson: minimalFlow,
        status: "published",
        publishedAt: new Date(),
      },
    });
    await prisma.geminiScenario.create({
      data: {
        scenarioId: id,
        persona: "テスト用ペルソナ",
        conversationRules: "テスト用ルール",
        businessKnowledge: "テスト用ナレッジ",
        guardRails: "テスト用ガードレール",
        humanFirstEnabled: true,
        humanFirstNumber,
        humanFirstTimeout: 18,
      },
    });
  }

  await prisma.phoneNumber.create({
    data: {
      id: phoneId,
      tenantId,
      scenarioId,
      number: phoneNumber,
      twilioNumberSid: `PNTEST_HF_${ulid()}`,
      status: "active",
      ivrEnabled: false,
    },
  });

  await prisma.phoneNumber.create({
    data: {
      id: ivrPhoneId,
      tenantId,
      scenarioId: ivrScenarioId,
      number: ivrPhoneNumber,
      twilioNumberSid: `PNTEST_HF_IVR_${ulid()}`,
      status: "active",
      ivrEnabled: true,
      ivrMessage: "1を押してください。",
    },
  });

  await prisma.ivrRoute.create({
    data: {
      phoneNumberId: ivrPhoneId,
      digit: "1",
      label: "人間優先",
      scenarioId: ivrScenarioId,
      sortOrder: 0,
    },
  });
});

afterAll(async () => {
  await prisma.ivrRoute.deleteMany({ where: { phoneNumberId: ivrPhoneId } });
  await prisma.phoneNumber.deleteMany({ where: { tenantId } });
  await prisma.geminiScenario.deleteMany({
    where: { scenarioId: { in: [scenarioId, ivrScenarioId] } },
  });
  await prisma.scenario.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("POST /webhooks/twilio/voice — human-first mode", () => {
  it("returns <Dial> when human-first is enabled (non-IVR)", async () => {
    const res = await request(app)
      .post("/webhooks/twilio/voice")
      .type("form")
      .send({ To: phoneNumber, From: "+819000000000" });

    expect(res.status).toBe(200);
    expect(res.type).toBe("text/xml");
    expect(res.text).toContain("<Dial");
    expect(res.text).toContain('timeout="18"');
    expect(res.text).toContain("human-first-fallback");
    expect(res.text).toContain(humanFirstNumber);
    expect(res.text).not.toContain("<Connect>");
  });

  it("returns <Connect><Stream> when human-first is disabled", async () => {
    await prisma.geminiScenario.update({
      where: { scenarioId },
      data: { humanFirstEnabled: false },
    });

    const res = await request(app)
      .post("/webhooks/twilio/voice")
      .type("form")
      .send({ To: phoneNumber, From: "+819000000000" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("<Connect>");
    expect(res.text).toContain("<Stream");
    expect(res.text).not.toContain("<Dial");

    await prisma.geminiScenario.update({
      where: { scenarioId },
      data: { humanFirstEnabled: true },
    });
  });
});

describe("POST /webhooks/twilio/human-first-fallback", () => {
  const fallbackQuery = `called=${encodeURIComponent(phoneNumber)}&from=%2B819000000000&scenarioId=${scenarioId}`;

  it("returns <Hangup> when human answered", async () => {
    const res = await request(app)
      .post(`/webhooks/twilio/human-first-fallback?${fallbackQuery}`)
      .type("form")
      .send({ DialCallStatus: "completed" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("<Hangup");
    expect(res.text).not.toContain("<Connect>");
  });

  it("returns <Hangup> when dial status is answered", async () => {
    const res = await request(app)
      .post(`/webhooks/twilio/human-first-fallback?${fallbackQuery}`)
      .type("form")
      .send({ DialCallStatus: "answered" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("<Hangup");
  });

  it("returns <Connect><Stream> on no-answer", async () => {
    const res = await request(app)
      .post(`/webhooks/twilio/human-first-fallback?${fallbackQuery}`)
      .type("form")
      .send({ DialCallStatus: "no-answer" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("<Connect>");
    expect(res.text).toContain("<Stream");
    expect(res.text).toContain(scenarioId);
  });

  it("returns <Connect><Stream> on busy/failed/canceled", async () => {
    for (const status of ["busy", "failed", "canceled"]) {
      const res = await request(app)
        .post(`/webhooks/twilio/human-first-fallback?${fallbackQuery}`)
        .type("form")
        .send({ DialCallStatus: status });

      expect(res.status).toBe(200);
      expect(res.text).toContain("<Connect>");
      expect(res.text).toContain("<Stream");
    }
  });
});

describe("POST /webhooks/twilio/ivr-route — human-first after IVR", () => {
  it("returns <Dial> when selected scenario has human-first enabled", async () => {
    const res = await request(app)
      .post(
        `/webhooks/twilio/ivr-route?called=${encodeURIComponent(ivrPhoneNumber)}&from=%2B819000000000`,
      )
      .type("form")
      .send({ Digits: "1" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("<Dial");
    expect(res.text).toContain("human-first-fallback");
    expect(res.text).toContain(humanFirstNumber);
    expect(res.text).toContain(ivrScenarioId);
    expect(res.text).not.toContain("<Connect>");
  });
});
