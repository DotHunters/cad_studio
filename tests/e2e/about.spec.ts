import { expect, test } from "@playwright/test";

test.describe("about page", () => {
  test("shows the owner profile with confirmed facts only", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Behind the lens");
    const owner = page.getByRole("region", { name: "I. Rukshan" });
    await expect(owner).toContainText("Founder & Lead Photographer");
    await expect(owner).toContainText("10+");
    await expect(owner).toContainText("Event management");
    await expect(owner).toContainText("Scarborough, Toronto");
  });

  test("explains how event management benefits clients", async ({ page }) => {
    await page.goto("/en/about");
    const approach = page.getByRole("region", { name: /Why event experience matters/ });
    await expect(approach.getByRole("listitem")).toHaveCount(3);
  });

  test("links to contact", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByRole("link", { name: "Contact us" })).toHaveAttribute(
      "href",
      "/en/contact",
    );
  });

  test("is localized in French", async ({ page }) => {
    await page.goto("/fr/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Derrière l’objectif");
  });

  test("never shows placeholder markers", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByText(/TODO/)).toHaveCount(0);
  });
});
