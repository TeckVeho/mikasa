import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { waitForLoginForm } from "./page";

export async function loginAsDev(
  page: Page,
  email = "admin@example.com",
): Promise<void> {
  await waitForLoginForm(page);
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(email);
  await expect(emailInput).toHaveValue(email);
  await page.locator('input[type="password"]').fill("e2e-dev-password");

  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000, waitUntil: "commit" });
}
