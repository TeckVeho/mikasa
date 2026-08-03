import { expect, test } from "@playwright/test";
import { loginAsDev } from "./fixtures/auth";

test.describe("Teams schedule", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDev(page);
  });

  test("shows team view heading from sidebar", async ({ page }) => {
    await page.getByRole("link", { name: "班別ビュー" }).click();
    await expect(page).toHaveURL(/\/teams/);
    await expect(
      page.getByRole("heading", { name: "班別ビュー", exact: true }),
    ).toBeVisible();
  });

  test("daily-input redirects to teams", async ({ page }) => {
    await page.goto("/daily-input");
    await expect(page).toHaveURL(/\/teams/);
    await expect(
      page.getByRole("heading", { name: "班別ビュー", exact: true }),
    ).toBeVisible();
  });
});
