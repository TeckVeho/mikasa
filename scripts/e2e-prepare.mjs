import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "apps/api");

const databaseUrl =
  process.env.DATABASE_URL ??
  "mysql://misaki:misaki@127.0.0.1:3306/misaki";

const env = { ...process.env, DATABASE_URL: databaseUrl };

function run(cmd, cwd = root) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, env, stdio: "inherit" });
}

writeFileSync(
  path.join(root, ".env"),
  `DATABASE_URL="${databaseUrl}"\n`,
  "utf8",
);
writeFileSync(
  path.join(apiDir, ".env"),
  `DATABASE_URL="${databaseUrl}"\n`,
  "utf8",
);

async function waitForMysql() {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      run("npx prisma migrate deploy", apiDir);
      return;
    } catch {
      if (attempt === maxAttempts) {
        throw new Error("MySQL not ready for prisma migrate deploy");
      }
      console.log(`MySQL not ready (attempt ${attempt}/${maxAttempts}), retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

run("npm run build -w @logivoice/shared");
run("npx prisma generate", apiDir);
await waitForMysql();
run("npm run seed:dev", apiDir);
run("node scripts/e2e-copy-web-env.mjs");

console.log("E2E prepare complete.");
