import type { Result } from "@logivoice/shared";
import { PDFParse } from "pdf-parse";
import * as scenarioRepo from "../repositories/scenario.repo.js";
import * as geminiRepo from "../repositories/gemini-scenario.repo.js";
import { logger } from "../lib/logger.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const SUPPORTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
};

async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const kind = SUPPORTED_TYPES[mimeType];
  if (!kind) {
    throw new Error(`サポートされていないファイル形式です: ${mimeType}`);
  }

  if (kind === "pdf") {
    const pdf = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await pdf.getText();
      return result.text.trim();
    } finally {
      await pdf.destroy();
    }
  }

  return buffer.toString("utf-8").trim();
}

export async function uploadKnowledge(
  tenantId: string,
  scenarioId: string,
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  mode: "replace" | "append" = "replace",
): Promise<Result<{ knowledge: string; extractedLength: number }>> {
  if (fileBuffer.length > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: "ファイルサイズが上限（10MB）を超えています",
      code: "VALIDATION_ERROR",
    };
  }

  if (!SUPPORTED_TYPES[mimeType]) {
    return {
      ok: false,
      error: `サポートされていないファイル形式です。対応形式: PDF, TXT, Markdown, CSV`,
      code: "VALIDATION_ERROR",
    };
  }

  const scenario = await scenarioRepo.findScenarioById(tenantId, scenarioId);
  if (!scenario) return { ok: false, error: "Not found", code: "NOT_FOUND" };

  let extracted: string;
  try {
    extracted = await extractText(fileBuffer, mimeType);
  } catch (e) {
    logger.error({ err: e, fileName, mimeType }, "Text extraction failed");
    return {
      ok: false,
      error: "ファイルからテキストを抽出できませんでした",
      code: "INTERNAL_ERROR",
    };
  }

  if (!extracted) {
    return {
      ok: false,
      error:
        "ファイルからテキストを抽出できませんでした。スキャンPDF等の画像ベースのファイルには対応していません。",
      code: "VALIDATION_ERROR",
    };
  }

  const existing = await geminiRepo.getByScenarioId(scenarioId);
  let finalKnowledge: string;

  if (mode === "append" && existing?.businessKnowledge) {
    finalKnowledge = `${existing.businessKnowledge}\n\n---\n\n## ${fileName}\n\n${extracted}`;
  } else {
    finalKnowledge = `## ${fileName}\n\n${extracted}`;
  }

  await geminiRepo.updateKnowledge(scenarioId, finalKnowledge);

  return {
    ok: true,
    data: {
      knowledge: finalKnowledge,
      extractedLength: extracted.length,
    },
  };
}
