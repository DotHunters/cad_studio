import { expect, test } from "@playwright/test";

// List pages show a skeleton while the next page loads (AGENTS.md §12). Client-side
// navigation is slowed down so the loading state is observable.
test("navigating to the gallery shows a skeleton until it loads", async ({ page, isMobile }) => {
  test.skip(isMobile, "Uses the desktop header link.");
  await page.goto("/en/packages");
  await page.route(/\/en\/gallery\?_rsc=/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.getByRole("banner").getByRole("link", { name: "Gallery" }).click();
  await expect(page.getByTestId("list-skeleton")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Loading…" })).toBeAttached();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("list-skeleton")).toHaveCount(0);
});
