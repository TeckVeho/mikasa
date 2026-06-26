/** @type {import('lint-staged').Config} */
export default {
  "apps/**/*.{ts,tsx}": "node scripts/lint-staged-typecheck.mjs",
  "packages/**/*.{ts,tsx}": "node scripts/lint-staged-typecheck.mjs",
  "tsconfig.base.json": "npm run typecheck",
  "turbo.json": "npm run typecheck",
};
