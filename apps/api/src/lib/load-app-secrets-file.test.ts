import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadAppSecretsFile } from "./load-app-secrets-file.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("loadAppSecretsFile", () => {
  it("loads keys from APP_SECRETS_FILE without overriding existing env", () => {
    const dir = mkdtempSync(join(tmpdir(), "mikasa-secrets-"));
    const file = join(dir, "app.env");
    writeFileSync(
      file,
      [
        "# comment",
        "FIREBASE_CLIENT_EMAIL=svc@test.iam.gserviceaccount.com",
        'FIREBASE_PRIVATE_KEY="line1\\nline2"',
        "SKIP=should-not-appear",
      ].join("\n"),
      "utf8",
    );

    process.env.APP_SECRETS_FILE = file;
    process.env.SKIP = "preset";

    loadAppSecretsFile();

    expect(process.env.FIREBASE_CLIENT_EMAIL).toBe("svc@test.iam.gserviceaccount.com");
    expect(process.env.FIREBASE_PRIVATE_KEY).toBe("line1\nline2");
    expect(process.env.SKIP).toBe("preset");
  });

  it("no-ops when APP_SECRETS_FILE is unset", () => {
    delete process.env.APP_SECRETS_FILE;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    loadAppSecretsFile();
    expect(process.env.FIREBASE_CLIENT_EMAIL).toBeUndefined();
  });
});
