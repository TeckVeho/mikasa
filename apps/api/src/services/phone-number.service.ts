import type { Result } from "@logivoice/shared";
import { newId } from "../utils/id.js";
import * as repo from "../repositories/phone-number.repo.js";
import {
  listAvailableLocalNumbers,
  purchaseNumber,
  releaseNumber,
} from "../lib/twilio.js";
import { prisma } from "../lib/prisma.js";

export async function getNumber(
  tenantId: string,
  id: string,
): Promise<Result<unknown>> {
  const p = await repo.findPhoneNumberById(tenantId, id);
  if (!p) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  return {
    ok: true,
    data: {
      id: p.id,
      number: p.number,
      scenarioId: p.scenarioId,
      scenario: p.scenario
        ? { id: p.scenario.id, name: p.scenario.name }
        : null,
      status: p.status,
    },
  };
}

export async function listNumbers(tenantId: string): Promise<Result<unknown[]>> {
  const rows = await repo.findPhoneNumbersForTenant(tenantId);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const out = await Promise.all(
    rows.map(async (p) => {
      const monthlyCallCount = await prisma.callLog.count({
        where: {
          phoneNumberId: p.id,
          createdAt: { gte: startOfMonth },
        },
      });
      return {
        id: p.id,
        number: p.number,
        scenarioId: p.scenarioId,
        scenarioName: p.scenario?.name ?? null,
        status: p.status,
        monthlyCallCount,
        createdAt: p.createdAt.toISOString(),
      };
    }),
  );

  return { ok: true, data: out };
}

export async function addNumber(
  tenantId: string,
  body: { twilioNumberSid?: string; phoneNumber?: string },
): Promise<Result<unknown>> {
  if (body.twilioNumberSid && body.phoneNumber) {
    const id = newId();
    await repo.createPhoneNumber({
      id,
      tenantId,
      scenarioId: null,
      number: body.phoneNumber,
      twilioNumberSid: body.twilioNumberSid,
      status: "inactive",
    });
    return { ok: true, data: { id } };
  }
  return {
    ok: false,
    error: "twilioNumberSid and phoneNumber required",
    code: "VALIDATION_ERROR",
  };
}

export async function availableNumbers(): Promise<Result<unknown>> {
  const r = await listAvailableLocalNumbers();
  if (!r.ok) {
    return { ok: false, error: r.message, code: "TWILIO_ERROR" };
  }
  return { ok: true, data: r.data };
}

export async function purchaseAndAdd(
  tenantId: string,
  phoneNumber: string,
): Promise<Result<unknown>> {
  const purchased = await purchaseNumber(phoneNumber);
  if (!purchased.ok) {
    return { ok: false, error: purchased.message, code: "TWILIO_ERROR" };
  }
  const id = newId();
  await repo.createPhoneNumber({
    id,
    tenantId,
    scenarioId: null,
    number: purchased.data.phoneNumber,
    twilioNumberSid: purchased.data.sid,
    status: "inactive",
  });
  return { ok: true, data: { id, number: purchased.data.phoneNumber } };
}

export async function deleteNumber(
  tenantId: string,
  id: string,
): Promise<Result<unknown>> {
  const p = await repo.findPhoneNumberById(tenantId, id);
  if (!p) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  const rel = await releaseNumber(p.twilioNumberSid);
  if (!rel.ok) {
    return { ok: false, error: rel.message, code: "TWILIO_ERROR" };
  }
  await repo.deletePhoneNumber(tenantId, id);
  return { ok: true, data: true };
}

export async function patchScenario(
  tenantId: string,
  id: string,
  scenarioId: string,
): Promise<Result<unknown>> {
  const n = await repo.patchPhoneNumberScenario(tenantId, id, scenarioId);
  if (n.count === 0) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  return { ok: true, data: true };
}

export async function patchStatus(
  tenantId: string,
  id: string,
  status: string,
): Promise<Result<unknown>> {
  const n = await repo.patchPhoneNumberStatus(tenantId, id, status);
  if (n.count === 0) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  return { ok: true, data: true };
}
