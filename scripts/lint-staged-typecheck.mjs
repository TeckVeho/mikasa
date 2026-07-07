#!/usr/bin/env node
/**
 * lint-staged helper: run `npm run typecheck -w <pkg>` for workspaces
 * touched by staged .ts/.tsx files (and dependents when shared changes).
 */
import { execSync } from "node:child_process";
import path from "node:path";

const repoRoot = execSync("git rev-parse --show-toplevel", {
  encoding: "utf8",
}).trim();

function toRepoRelative(file) {
  const normalized = path.normalize(file);
  if (normalized.startsWith(repoRoot + path.sep)) {
    return normalized.slice(repoRoot.length + 1);
  }
  return normalized.replace(/^\.\//, "");
}

const files = process.argv
  .slice(2)
  .map(toRepoRelative)
  .filter((f) => /\.tsx?$/.test(f));

if (files.length === 0) {
  process.exit(0);
}

const ROOT_CONFIG = new Set([
  "tsconfig.base.json",
  "turbo.json",
  "package.json",
  "package-lock.json",
]);

const WORKSPACE_PREFIXES = [
  { prefix: "packages/shared/", pkg: "@logivoice/shared" },
  { prefix: "apps/web/", pkg: "@logivoice/web" },
  { prefix: "apps/api/", pkg: "@logivoice/api" },
];

const SHARED_DEPENDENTS = ["@logivoice/api", "@logivoice/web"];

if (files.some((f) => ROOT_CONFIG.has(f.split("/").pop() ?? f))) {
  execSync("npm run typecheck", { stdio: "inherit" });
  process.exit(0);
}

const workspaces = new Set();

for (const file of files) {
  for (const { prefix, pkg } of WORKSPACE_PREFIXES) {
    if (file.startsWith(prefix)) {
      workspaces.add(pkg);
    }
  }
}

if (workspaces.has("@logivoice/shared")) {
  for (const pkg of SHARED_DEPENDENTS) {
    workspaces.add(pkg);
  }
}

if (workspaces.size === 0) {
  process.exit(0);
}

for (const pkg of [...workspaces].sort()) {
  console.log(`\n→ typecheck ${pkg}`);
  execSync(`npm run typecheck -w ${pkg}`, { stdio: "inherit" });
}
