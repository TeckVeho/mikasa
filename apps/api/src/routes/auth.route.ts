import { Router } from "express";
import { verifyAuthToken } from "../services/auth.service.js";
import { sendResult } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/verify", async (req, res) => {
  const token =
    (typeof req.body?.token === "string" ? req.body.token : undefined) ??
    req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(422).json({
      ok: false,
      error: "VALIDATION_ERROR",
      message: "token required",
    });
    return;
  }
  const r = await verifyAuthToken(token);
  sendResult(res, r);
});
