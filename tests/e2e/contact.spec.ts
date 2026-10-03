import { expect, test } from "@playwright/test";

test.describe("contact page", () => {
  test("shows the service area and no street address", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tell us about your story");
    await expect(page.locator("main")).toContainText("Based in Toronto");
    await expect(page.locator("main iframe")).toHaveCount(0);
  });

  test("shows inline errors for an empty submission and focuses the first one", async ({
    page,
  }) => {
    await page.goto("/en/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    const name = page.getByLabel("Name");
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toBeFocused();
    await expect(page.getByText("This field is required.").first()).toBeVisible();
    await expect(page.getByText("Please write at least 10 characters.")).toBeVisible();
  });

  test("validates the email format", async ({ page }) => {
    await page.goto("/en/contact");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  });

  test("submits a valid enquiry and shows the success state", async ({ page }) => {
    await page.goto("/en/contact");
    await page.getByLabel("Name").fill("Test Client");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("What's this about?").selectOption("wedding");
    await page.getByLabel("Message").fill("We are planning a wedding next summer in Toronto.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Thank you" })).toBeVisible();
    await page.getByRole("button", { name: "Send another message" }).click();
    await expect(page.getByLabel("Name")).toHaveValue("");
  });

  test("offers a privacy request option and links to the privacy policy", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page.getByLabel("What's this about?")).toContainText("Privacy request");
    await expect(page.getByRole("link", { name: "privacy policy" })).toHaveAttribute(
      "href",
      "/en/privacy",
    );
  });

  test("hides the honeypot from assistive technology", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page.getByRole("textbox", { name: "Leave this field empty" })).toHaveCount(0);
  });

  test("is localized in French, including errors", async ({ page }) => {
    await page.goto("/fr/contact");
    await page.getByRole("button", { name: "Envoyer le message" }).click();
    await expect(page.getByText("Ce champ est obligatoire.").first()).toBeVisible();
  });
});
