import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function waitForLoginForm(page: Page): Promise<void> {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "ミカサ金属 負荷計算システム" }),
  ).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  // Dev-mode panel appears only after client hydration (shouldUseDevAuth).
  await expect(page.getByText("開発モード", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}
