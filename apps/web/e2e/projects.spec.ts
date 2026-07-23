import { expect, test } from "@playwright/test";
import { loginAsDev } from "./fixtures/auth";

test.describe("Projects flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDev(page);
  });

  test("shows projects list heading", async ({ page }) => {
    await page.goto("/projects");
    await expect(
      page.getByRole("heading", { name: "工事一覧", exact: true }),
    ).toBeVisible();
  });

  test("navigates from list to project detail", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "240101" }).click();
    await expect(
      page.getByRole("heading", {
        name: "240101 阪神高速 伸縮装置更新",
        exact: true,
      }),
    ).toBeVisible();
  });
});
