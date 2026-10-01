import { expect, test } from "@playwright/test";

test.describe("site layout", () => {
  test("shows the logo, footer and pricing banner", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("link", { name: "Cad Studio home" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("Scarborough");
    await expect(page.getByRole("status")).toContainText("Pricing pending owner confirmation");
  });

  test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/en");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
  });

  // TODO(2.3): switch to /en/packages once that page exists, to cover path preservation.
  test("language switcher opens the same page in French", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: "Voir le site en français" }).click();
    await expect(page).toHaveURL(/\/fr$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
  });

  test("theme toggle switches to dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en");
    await page.getByRole("button", { name: "Toggle light and dark theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("menu opens, lists pages and closes with Escape", async ({ page }) => {
    await page.goto("/en");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    const menu = page.getByRole("navigation", { name: "Main" });
    await expect(menu.getByRole("link", { name: "Packages" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Get a Quote" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
