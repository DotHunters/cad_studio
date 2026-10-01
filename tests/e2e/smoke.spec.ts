import { expect, test } from "@playwright/test";

test("home page renders the studio name", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Cad Studio/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cad Studio");
});
