import type { Result } from "@logivoice/shared";
import { newId } from "../utils/id.js";
import * as repo from "../repositories/phone-number.repo.js";
import {
  listAvailableLocalNumbers,
  purchaseNumber,
  releaseNumber,
  createByocTrunk,
  deleteByocTrunk,
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
      numberType: p.numberType,
      byocTrunkSid: p.byocTrunkSid ?? null,
      scenarioId: p.scenarioId,
      scenario: p.scenario
        ? { id: p.scenario.id, name: p.scenario.name }
        : null,
      status: p.status,
      ivrEnabled: p.ivrEnabled,
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
        numberType: p.numberType,
        byocTrunkSid: p.byocTrunkSid ?? null,
        scenarioId: p.scenarioId,
        scenarioName: p.scenario?.name ?? null,
        status: p.status,
        ivrEnabled: p.ivrEnabled,
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
    return { ok: false, error: r.error, code: "TWILIO_ERROR" };
  }
  return { ok: true, data: r.data };
}

export async function purchaseAndAdd(
  tenantId: string,
  phoneNumber: string,
): Promise<Result<unknown>> {
  const purchased = await purchaseNumber(phoneNumber);
  if (!purchased.ok) {
      return { ok: false, error: purchased.error, code: "TWILIO_ERROR" };
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

  if (p.numberType === "byoc") {
    if (p.byocTrunkSid) {
      const rel = await deleteByocTrunk(p.byocTrunkSid);
      if (!rel.ok) {
        return { ok: false, error: rel.error, code: "TWILIO_ERROR" };
      }
    }
  } else {
    if (p.twilioNumberSid) {
      const rel = await releaseNumber(p.twilioNumberSid);
      if (!rel.ok) {
        return { ok: false, error: rel.error, code: "TWILIO_ERROR" };
      }
    }
  }

  await repo.deletePhoneNumber(tenantId, id);
  return { ok: true, data: true };
}

export async function addByocNumber(
  tenantId: string,
  phoneNumber: string,
): Promise<Result<unknown>> {
  const voiceUrl = `${process.env.API_PUBLIC_URL ?? "http://localhost:8080"}/webhooks/twilio/voice`;
  const created = await createByocTrunk(`BYOC ${phoneNumber}`, voiceUrl);
  if (!created.ok) {
    return { ok: false, error: created.error, code: "TWILIO_ERROR" };
  }
  const id = newId();
  await repo.createPhoneNumber({
    id,
    tenantId,
    scenarioId: null,
    number: phoneNumber,
    twilioNumberSid: null,
    byocTrunkSid: created.data.byocTrunkSid,
    numberType: "byoc",
    status: "inactive",
  });
  return {
    ok: true,
    data: { id, number: phoneNumber, byocTrunkSid: created.data.byocTrunkSid },
  };
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

export async function getIvrSettings(
  tenantId: string,
  phoneNumberId: string,
): Promise<Result<unknown>> {
  const p = await repo.findPhoneNumberWithIvr(tenantId, phoneNumberId);
  if (!p) return { ok: false, error: "Not found", code: "NOT_FOUND" };
  return {
    ok: true,
    data: {
      ivrEnabled: p.ivrEnabled,
      ivrMessage: p.ivrMessage,
      routes: p.ivrRoutes.map((r) => ({
        id: r.id,
        digit: r.digit,
        label: r.label,
        scenarioId: r.scenarioId,
        scenarioName: r.scenario.name,
        sortOrder: r.sortOrder,
      })),
    },
  };
}

type IvrSettingsInput = {
  ivrEnabled: boolean;
  ivrMessage: string | null;
  routes: {
    digit: string;
    label: string;
    scenarioId: string;
  }[];
};

export async function updateIvrSettings(
  tenantId: string,
  phoneNumberId: string,
  data: IvrSettingsInput,
): Promise<Result<unknown>> {
  const p = await repo.findPhoneNumberById(tenantId, phoneNumberId);
  if (!p) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  if (data.routes.length > 10) {
    return { ok: false, error: "Maximum 10 routes allowed", code: "VALIDATION_ERROR" };
  }

  const digitPattern = /^[0-9]$/;
  for (const r of data.routes) {
    if (!digitPattern.test(r.digit)) {
      return {
        ok: false,
        error: `Invalid digit: "${r.digit}". Must be 0-9`,
        code: "VALIDATION_ERROR",
      };
    }
  }

  const digits = data.routes.map((r) => r.digit);
  if (new Set(digits).size !== digits.length) {
    return { ok: false, error: "Duplicate digits are not allowed", code: "VALIDATION_ERROR" };
  }

  if (data.ivrEnabled && data.routes.length === 0) {
    return {
      ok: false,
      error: "At least one route is required when IVR is enabled",
      code: "VALIDATION_ERROR",
    };
  }

  await repo.updateIvrSettings(phoneNumberId, {
    ivrEnabled: data.ivrEnabled,
    ivrMessage: data.ivrMessage,
    routes: data.routes.map((r, i) => ({
      digit: r.digit,
      label: r.label,
      scenarioId: r.scenarioId,
      sortOrder: i,
    })),
  });

  return { ok: true, data: true };
}
