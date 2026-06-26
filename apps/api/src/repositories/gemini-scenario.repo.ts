import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function getByScenarioId(scenarioId: string) {
  return prisma.geminiScenario.findUnique({
    where: { scenarioId },
  });
}

/** Gemini 設定を取得。scenario が指定テナントに属することを保証する。 */
export async function getByScenarioIdForTenant(
  scenarioId: string,
  tenantId: string,
) {
  return prisma.geminiScenario.findFirst({
    where: {
      scenarioId,
      scenario: { tenantId },
    },
  });
}

export async function upsert(
  scenarioId: string,
  data: {
    persona: string;
    conversationRules: string;
    businessKnowledge: string;
    guardRails: string;
    toolDefinitions?: Prisma.InputJsonValue;
    voiceName?: string;
    languageCode?: string;
    transferEnabled?: boolean;
    transferNumber?: string | null;
    transferTimeout?: number;
    humanFirstEnabled?: boolean;
    humanFirstNumber?: string | null;
    humanFirstTimeout?: number;
  },
) {
  return prisma.geminiScenario.upsert({
    where: { scenarioId },
    create: {
      scenarioId,
      persona: data.persona,
      conversationRules: data.conversationRules,
      businessKnowledge: data.businessKnowledge,
      guardRails: data.guardRails,
      toolDefinitions: data.toolDefinitions ?? "[]",
      voiceName: data.voiceName ?? "Aoede",
      languageCode: data.languageCode ?? "ja-JP",
      transferEnabled: data.transferEnabled ?? true,
      transferNumber: data.transferNumber ?? null,
      transferTimeout: data.transferTimeout ?? 30,
      humanFirstEnabled: data.humanFirstEnabled ?? false,
      humanFirstNumber: data.humanFirstNumber ?? null,
      humanFirstTimeout: data.humanFirstTimeout ?? 18,
    },
    update: {
      persona: data.persona,
      conversationRules: data.conversationRules,
      businessKnowledge: data.businessKnowledge,
      guardRails: data.guardRails,
      ...(data.toolDefinitions !== undefined && {
        toolDefinitions: data.toolDefinitions,
      }),
      ...(data.voiceName !== undefined && { voiceName: data.voiceName }),
      ...(data.languageCode !== undefined && {
        languageCode: data.languageCode,
      }),
      ...(data.transferEnabled !== undefined && {
        transferEnabled: data.transferEnabled,
      }),
      ...(data.transferNumber !== undefined && {
        transferNumber: data.transferNumber,
      }),
      ...(data.transferTimeout !== undefined && {
        transferTimeout: data.transferTimeout,
      }),
      ...(data.humanFirstEnabled !== undefined && {
        humanFirstEnabled: data.humanFirstEnabled,
      }),
      ...(data.humanFirstNumber !== undefined && {
        humanFirstNumber: data.humanFirstNumber,
      }),
      ...(data.humanFirstTimeout !== undefined && {
        humanFirstTimeout: data.humanFirstTimeout,
      }),
    },
  });
}

export async function updateKnowledge(
  scenarioId: string,
  businessKnowledge: string,
) {
  return prisma.geminiScenario.upsert({
    where: { scenarioId },
    create: {
      scenarioId,
      persona: "",
      conversationRules: "",
      businessKnowledge,
      guardRails: "",
      toolDefinitions: "[]",
    },
    update: { businessKnowledge },
  });
}

export async function deleteByScenarioId(scenarioId: string) {
  return prisma.geminiScenario.deleteMany({
    where: { scenarioId },
  });
}
