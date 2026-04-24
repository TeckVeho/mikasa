import { prisma } from "../lib/prisma.js";

export async function findPhoneNumbersForTenant(tenantId: string) {
  return prisma.phoneNumber.findMany({
    where: { tenantId },
    include: { scenario: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function findPhoneNumberById(tenantId: string, id: string) {
  return prisma.phoneNumber.findFirst({
    where: { id, tenantId },
    include: { scenario: true },
  });
}

export async function findPhoneNumberByTwilioSid(twilioNumberSid: string) {
  return prisma.phoneNumber.findFirst({
    where: { twilioNumberSid },
    include: { tenant: true, scenario: true },
  });
}

export async function createPhoneNumber(data: {
  id: string;
  tenantId: string;
  scenarioId: string | null;
  number: string;
  twilioNumberSid: string;
  status: string;
}) {
  return prisma.phoneNumber.create({ data });
}

export async function deletePhoneNumber(tenantId: string, id: string) {
  return prisma.phoneNumber.deleteMany({
    where: { id, tenantId },
  });
}

export async function patchPhoneNumberScenario(
  tenantId: string,
  id: string,
  scenarioId: string | null,
) {
  return prisma.phoneNumber.updateMany({
    where: { id, tenantId },
    data: { scenarioId },
  });
}

export async function patchPhoneNumberStatus(
  tenantId: string,
  id: string,
  status: string,
) {
  return prisma.phoneNumber.updateMany({
    where: { id, tenantId },
    data: { status },
  });
}

export async function findPhoneNumberWithIvr(tenantId: string, id: string) {
  return prisma.phoneNumber.findFirst({
    where: { id, tenantId },
    include: {
      scenario: true,
      ivrRoutes: {
        include: { scenario: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function updateIvrSettings(
  phoneNumberId: string,
  data: {
    ivrEnabled: boolean;
    ivrMessage: string | null;
    routes: { digit: string; label: string; scenarioId: string; sortOrder: number }[];
  },
) {
  return prisma.$transaction([
    prisma.ivrRoute.deleteMany({ where: { phoneNumberId } }),
    prisma.phoneNumber.update({
      where: { id: phoneNumberId },
      data: { ivrEnabled: data.ivrEnabled, ivrMessage: data.ivrMessage },
    }),
    ...data.routes.map((r) =>
      prisma.ivrRoute.create({
        data: {
          phoneNumberId,
          digit: r.digit,
          label: r.label,
          scenarioId: r.scenarioId,
          sortOrder: r.sortOrder,
        },
      }),
    ),
  ]);
}
