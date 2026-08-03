import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "apps/web/.env.e2e");
const dest = path.join(root, "apps/web/.env.local");

if (!existsSync(src)) {
  console.error(`Missing ${src}`);
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`Copied ${src} -> ${dest}`);
