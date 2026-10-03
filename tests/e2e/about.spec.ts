import { expect, test } from "@playwright/test";

test.describe("about page", () => {
  test("shows the owner profile with confirmed facts only", async ({ page }) => {
    await page.goto("/en/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Behind the lens");
    const owner = page.getByRole("region", { name: "I. Rukshan" });
    await expect(owner).toContainText("Founder & Lead Photographer");
    await expect(owner).toContainText("2014");
    await expect(owner).toContainText("2,000+");
    await expect(owner).toContainText("Canada · Sri Lanka");
  });

  test("tells the studio story and lists what the team brings", async ({ page }) => {
    await page.goto("/en/about");
    const story = page.getByRole("region", { name: "From Sri Lanka to Canada" });
    await expect(story).toContainText("Our journey began in Sri Lanka");
    await expect(story.getByRole("listitem")).toHaveCount(5);
  });

  test("explains how the studio works with clients", async ({ page }) => {
    await page.goto("/en/about");
    const approach = page.getByRole("region", {
      name: /From first consultation to final delivery/,
    });
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
