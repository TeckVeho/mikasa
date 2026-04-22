import type { Result } from "@logivoice/shared";
import type { Prisma } from "@prisma/client";
import * as scenarioRepo from "../repositories/scenario.repo.js";
import * as geminiRepo from "../repositories/gemini-scenario.repo.js";

export async function getGeminiScenario(
  tenantId: string,
  scenarioId: string,
): Promise<Result<unknown>> {
  const scenario = await scenarioRepo.findScenarioById(tenantId, scenarioId);
  if (!scenario) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  const gs = await geminiRepo.getByScenarioId(scenarioId);
  if (!gs) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  return {
    ok: true,
    data: {
      id: gs.id,
      scenarioId: gs.scenarioId,
      persona: gs.persona,
      conversationRules: gs.conversationRules,
      businessKnowledge: gs.businessKnowledge,
      guardRails: gs.guardRails,
      toolDefinitions: gs.toolDefinitions,
      voiceName: gs.voiceName,
      languageCode: gs.languageCode,
      transferEnabled: gs.transferEnabled,
      transferNumber: gs.transferNumber,
      transferTimeout: gs.transferTimeout,
      createdAt: gs.createdAt.toISOString(),
      updatedAt: gs.updatedAt.toISOString(),
    },
  };
}

export async function upsertGeminiScenario(
  tenantId: string,
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
  },
): Promise<Result<unknown>> {
  const scenario = await scenarioRepo.findScenarioById(tenantId, scenarioId);
  if (!scenario) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  const gs = await geminiRepo.upsert(scenarioId, data);
  return { ok: true, data: { id: gs.id, scenarioId: gs.scenarioId } };
}

export async function previewPrompt(
  tenantId: string,
  scenarioId: string,
): Promise<Result<unknown>> {
  const scenario = await scenarioRepo.findScenarioById(tenantId, scenarioId);
  if (!scenario) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  const gs = await geminiRepo.getByScenarioId(scenarioId);
  if (!gs) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  const sections = [
    `## ペルソナ\n${gs.persona}`,
    `## 対話ルール\n${gs.conversationRules}`,
    `## 業務ナレッジ\n${gs.businessKnowledge}`,
    `## ガードレール\n${gs.guardRails}`,
  ];

  return {
    ok: true,
    data: { systemInstruction: sections.join("\n\n") },
  };
}
