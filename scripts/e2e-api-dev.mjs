import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "apps/api");

const child = spawn(
  "npx",
  ["tsx", "watch", "src/server.ts"],
  {
    cwd: apiDir,
    env: {
      ...process.env,
      PORT: process.env.PORT ?? "8080",
      NODE_ENV: process.env.NODE_ENV ?? "development",
    },
    stdio: "inherit",
    shell: true,
  },
);

child.on("exit", (code) => process.exit(code ?? 1));
