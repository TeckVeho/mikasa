import { Router } from "express";
import multer from "multer";
import { requireAuth, sendResult } from "../middleware/auth.js";
import * as svc from "../services/scenario.service.js";
import * as geminiSvc from "../services/gemini-scenario.service.js";
import * as knowledgeUploadSvc from "../services/knowledge-upload.service.js";
import * as aiWizardSvc from "../services/ai-wizard.service.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const scenariosRouter = Router();

scenariosRouter.use(requireAuth);

scenariosRouter.get("/", async (req, res) => {
  const r = await svc.listScenarios(
    req.tenantId!,
    typeof req.query.type === "string" ? req.query.type : undefined,
  );
  sendResult(res, r);
});

scenariosRouter.post("/", async (req, res) => {
  const r = await svc.createScenario(req.tenantId!, req.body);
  sendResult(res, r);
});

// --- AI Wizard ---
scenariosRouter.post("/ai-wizard", async (req, res) => {
  const r = await aiWizardSvc.chat(req.tenantId!, req.body);
  sendResult(res, r);
});

scenariosRouter.get("/:id/versions", async (req, res) => {
  const r = await svc.listScenarioVersions(req.tenantId!, req.params.id);
  sendResult(res, r);
});

scenariosRouter.post("/:id/restore-version", async (req, res) => {
  const version = Number(req.body?.version);
  if (!Number.isFinite(version)) {
    res.status(422).json({ ok: false, error: "version required" });
    return;
  }
  const r = await svc.restoreScenarioVersion(
    req.tenantId!,
    req.params.id,
    version,
  );
  sendResult(res, r);
});

scenariosRouter.get("/:id", async (req, res) => {
  const r = await svc.getScenario(req.tenantId!, req.params.id);
  sendResult(res, r);
});

scenariosRouter.put("/:id", async (req, res) => {
  const r = await svc.updateScenario(req.tenantId!, req.params.id, req.body);
  sendResult(res, r);
});

scenariosRouter.post("/:id/publish", async (req, res) => {
  const r = await svc.publishScenario(req.tenantId!, req.params.id);
  sendResult(res, r);
});

scenariosRouter.post("/:id/duplicate", async (req, res) => {
  const r = await svc.duplicateScenario(req.tenantId!, req.params.id);
  sendResult(res, r);
});

scenariosRouter.delete("/:id", async (req, res) => {
  const r = await svc.deleteScenario(req.tenantId!, req.params.id);
  sendResult(res, r);
});

// --- Gemini Scenario ---

scenariosRouter.get("/:id/gemini", async (req, res) => {
  const r = await geminiSvc.getGeminiScenario(req.tenantId!, req.params.id);
  sendResult(res, r);
});

scenariosRouter.put("/:id/gemini", async (req, res) => {
  const r = await geminiSvc.upsertGeminiScenario(
    req.tenantId!,
    req.params.id,
    req.body,
  );
  sendResult(res, r);
});

scenariosRouter.post("/:id/gemini/preview-prompt", async (req, res) => {
  const r = await geminiSvc.previewPrompt(req.tenantId!, req.params.id, {
    persona: req.body?.persona,
    rules: req.body?.rules,
    knowledge: req.body?.knowledge,
    guardRails: req.body?.guardRails,
  });
  sendResult(res, r);
});

scenariosRouter.post(
  "/:id/gemini/upload-knowledge",
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      res.status(422).json({ ok: false, error: "VALIDATION_ERROR", message: "ファイルが必要です" });
      return;
    }
    const mode = req.body?.mode === "append" ? "append" as const : "replace" as const;
    const r = await knowledgeUploadSvc.uploadKnowledge(
      req.tenantId!,
      req.params.id,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      mode,
    );
    sendResult(res, r);
  },
);
