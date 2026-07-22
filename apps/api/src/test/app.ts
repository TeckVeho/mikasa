import "./prisma-mock.js";
import type { Express } from "express";
import { createApp } from "../app.js";

let app: Express | null = null;

export function getTestApp(): Express {
  if (!app) {
    app = createApp();
  }
  return app;
}
