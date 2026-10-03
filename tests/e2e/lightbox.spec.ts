import { expect, type Page, test } from "@playwright/test";

const dialog = (page: Page) => page.getByRole("dialog", { name: "Image viewer" });

async function openFirstWithKeyboard(page: Page) {
  await page.goto("/en/gallery");
  const first = page.getByRole("button", { name: /^Open image 1 of 12/ });
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  return first;
}

// AGENTS.md §15 scenario 6: gallery lightbox fully operable by keyboard.
test.describe("gallery lightbox", () => {
  test("opens with the keyboard and focuses the close button", async ({ page }) => {
    await openFirstWithKeyboard(page);
    await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
    await expect(dialog(page)).toContainText("1 / 12");
  });

  test("arrow keys move between images and wrap around", async ({ page }) => {
    await openFirstWithKeyboard(page);
    await page.keyboard.press("ArrowRight");
    await expect(dialog(page)).toContainText("2 / 12");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(dialog(page)).toContainText("12 / 12");
  });

  test("Escape closes and returns focus to the thumbnail", async ({ page }) => {
    const first = await openFirstWithKeyboard(page);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(first).toBeFocused();
  });

  test("focus stays inside the dialog", async ({ page }) => {
    await openFirstWithKeyboard(page);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const insideDialog = await page.evaluate(
        () =>
          document.activeElement?.closest("dialog") !== null ||
          document.activeElement === document.body,
      );
      expect(insideDialog).toBe(true);
    }
  });

  test("shows the alt text on demand", async ({ page }) => {
    await openFirstWithKeyboard(page);
    const toggle = page.getByRole("button", { name: "Show description" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(page.getByRole("button", { name: "Hide description" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(dialog(page).getByText(/\(photo 1 of \d+\)/)).toBeVisible();
  });

  test("prev/next buttons work", async ({ page }) => {
    await openFirstWithKeyboard(page);
    await page.getByRole("button", { name: "Next image" }).click();
    await expect(dialog(page)).toContainText("2 / 12");
  });

  test("swipes left to go to the next image", async ({ page }) => {
    await openFirstWithKeyboard(page);
    const box = (await dialog(page).boundingBox())!;
    const y = box.y + box.height / 2;
    await dialog(page).dispatchEvent("pointerdown", {
      pointerType: "touch",
      clientX: 300,
      clientY: y,
    });
    await dialog(page).dispatchEvent("pointerup", {
      pointerType: "touch",
      clientX: 150,
      clientY: y,
    });
    await expect(dialog(page)).toContainText("2 / 12");
  });

  test("case study images open in the lightbox too", async ({ page }) => {
    await page.goto("/en/portfolio/sample-northwind-annual-summit");
    await page.getByRole("button", { name: /^Open image 2 of 5/ }).click();
    await expect(dialog(page)).toContainText("2 / 5");
  });
});
