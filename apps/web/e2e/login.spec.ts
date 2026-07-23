import { expect, test } from "@playwright/test";
import { loginAsDev } from "./fixtures/auth";
import { waitForLoginForm } from "./fixtures/page";

test.describe("Login page", () => {
  test("renders email field and submit button", async ({ page }) => {
    await waitForLoginForm(page);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("dev login redirects to dashboard", async ({ page }) => {
    await loginAsDev(page);
    await expect(
      page.getByRole("heading", { name: "ダッシュボード", exact: true }),
    ).toBeVisible();
  });
});
