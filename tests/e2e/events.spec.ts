import { expect, test } from "@playwright/test";

test.describe("events page", () => {
  test("shows the four event services", async ({ page }) => {
    await page.goto("/en/events");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your event, handled");
    for (const name of ["Event management", "Décor", "Catering", "Lights & sound"]) {
      await expect(page.getByRole("heading", { level: 3, name })).toBeVisible();
    }
  });

  test("is linked from the header and the home page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Events" }).click();
    await expect(page).toHaveURL(/\/en\/events$/);
    await page.goto("/en");
    await page.getByRole("link", { name: "Explore event services" }).click();
    await expect(page).toHaveURL(/\/en\/events$/);
  });

  test("requires at least one service", async ({ page }) => {
    await page.goto("/en/events");
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByLabel("Name")).toBeFocused();
    await expect(page.getByText("Choose at least one service.")).toBeVisible();
  });

  test("submits an enquiry and shows the success state", async ({ page }) => {
    await page.goto("/en/events");
    await page.getByLabel("Name").fill("Test Client");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Type of event").selectOption("corporate");
    await page.getByLabel("City").fill("Toronto");
    await page.getByRole("checkbox", { name: "Lights & sound" }).check();
    await page.getByRole("textbox", { name: "Tell us about your event" }).fill("Annual gala for 150 guests in Toronto.");
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Thank you" })).toBeVisible();
  });

  test("is localized in French", async ({ page }) => {
    await page.goto("/fr/events");
    await expect(page.getByRole("heading", { level: 3, name: "Traiteur" })).toBeVisible();
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(page.getByText("Choisissez au moins un service.")).toBeVisible();
  });
});
