import { readFileSync } from "node:fs";

/**
 * Load KEY=value lines from APP_SECRETS_FILE into process.env (issue #28 bundle).
 * Does not override variables already set in the environment.
 */
export function loadAppSecretsFile(): void {
  const filePath = process.env.APP_SECRETS_FILE?.trim();
  if (!filePath) return;

  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, "\n");
    process.env[key] = value;
  }
}
