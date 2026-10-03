import { expect, type Page, test } from "@playwright/test";

import { queryDb } from "./db";

const total = (page: Page) => page.getByTestId("quote-total");

/** Navigate and wait until React has hydrated the form, so typed values reach the form state. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
}
const estimate = (page: Page) => page.getByRole("region", { name: "Your estimate" });

// 2027-06-09 is a Wednesday (no surcharge); 2027-06-12 is a Saturday.
const WEEKDAY = "2027-06-09";
const SATURDAY = "2027-06-12";

test.describe("quote generator", () => {
  test("prefills from a package and shows the base estimate with HST", async ({ page }) => {
    await open(page, "/en/quote?package=wedding");
    await expect(page.getByLabel("Event type")).toHaveValue("wedding");
    await expect(page.getByLabel("Package")).toHaveValue("wedding");
    await expect(page.getByLabel("Hours of coverage")).toHaveValue("8");
    await expect(page.getByLabel("Photographers")).toHaveValue("2");

    await expect(estimate(page)).toContainText("Complete the event details");
    await page.getByLabel("Event date").fill(WEEKDAY);
    // $2,800 + 13% HST
    await expect(total(page)).toHaveText("$3,164.00 CAD");
    await expect(estimate(page)).toContainText("Deposit to confirm (30%): $949.20");
    await expect(estimate(page)).toContainText(
      "Estimate only. Final price confirmed by CAD Studio Photography.",
    );
  });

  test("updates live as hours, add-ons and the date change", async ({ page }) => {
    await open(page, "/en/quote?package=wedding");
    await page.getByLabel("Event date").fill(WEEKDAY);

    await page.getByLabel("Hours of coverage").fill("10");
    // + 2 h × $200 = $3,200 + HST
    await expect(total(page)).toHaveText("$3,616.00 CAD");
    await expect(estimate(page)).toContainText("Extra hours (2 h)");

    await page.getByRole("checkbox", { name: "Drone coverage" }).check();
    // + $300 = $3,500 + HST
    await expect(total(page)).toHaveText("$3,955.00 CAD");

    await page.getByLabel("Event date").fill(SATURDAY);
    // + 10% weekend on $3,200 service = $320 → $3,820 + HST
    await expect(total(page)).toHaveText("$4,316.60 CAD");
    await expect(estimate(page)).toContainText("Weekend surcharge");
  });

  test("charges travel beyond the free radius", async ({ page }) => {
    await open(page, "/en/quote?package=corporate-event");
    await page.getByLabel("Event date").fill(WEEKDAY);
    await page.getByLabel("Distance from Toronto (km)").fill("100");
    // $1,200 + (60 km × 2 × $0.70 = $84) = $1,284 + HST
    await expect(total(page)).toHaveText("$1,450.92 CAD");
  });

  test("uses the province's tax", async ({ page }) => {
    await open(page, "/en/quote?package=corporate-event");
    await page.getByLabel("Event date").fill(WEEKDAY);
    await page.getByLabel("Province or territory").selectOption("QC");
    await expect(estimate(page)).toContainText("QST (9.975%)");
    // $1,200 + GST $60 + QST $119.70
    await expect(total(page)).toHaveText("$1,379.70 CAD");
  });

  test("flags international travel and drops Canadian tax", async ({ page }) => {
    await open(page, "/en/quote?package=corporate-event");
    await page.getByLabel("Event date").fill(WEEKDAY);
    await page.getByLabel("The event is outside Canada").check();
    await expect(total(page)).toHaveText("$1,200.00 CAD");
    await expect(estimate(page)).toContainText(
      "Travel for this location will be quoted separately.",
    );
  });

  test("suggests more photographers for large events", async ({ page }) => {
    await open(page, "/en/quote?package=corporate-event");
    await page.getByLabel("Event date").fill(WEEKDAY);
    await page.getByLabel("Guest count (optional)").fill("250");
    await expect(page.getByText("For about 250 guests we suggest 3 photographers.")).toBeVisible();
  });

  test("ignores dates in the past", async ({ page }) => {
    await open(page, "/en/quote?package=wedding");
    await page.getByLabel("Event date").fill("2020-01-15");
    await expect(estimate(page)).toContainText("Complete the event details");
  });

  test("starts from a category tile with the cheapest package", async ({ page }) => {
    await open(page, "/en/quote?category=family");
    await page.getByLabel("Event date").fill(WEEKDAY);
    await expect(estimate(page)).toContainText("Family Event package");
  });

  test("is localized in French with fr-CA currency format", async ({ page }) => {
    await open(page, "/fr/quote?package=wedding");
    await page.getByLabel("Date de l’événement").fill(WEEKDAY);
    await expect(total(page)).toHaveText(/3\s164,00\s\$\sCAD/);
    await expect(page.getByRole("region", { name: "Votre estimation" })).toContainText(
      "Forfait Mariage",
    );
  });

  test("marketing consent is never pre-checked (CASL)", async ({ page }) => {
    await open(page, "/en/quote?package=wedding");
    await expect(page.getByRole("checkbox", { name: /Send me occasional news/ })).not.toBeChecked();
  });

  test("shows inline errors for missing contact details", async ({ page }) => {
    await open(page, "/en/quote?package=wedding");
    await page.getByLabel("Event date").fill(WEEKDAY);
    await page.getByRole("button", { name: "Get my quote" }).click();
    await expect(page.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Name")).toBeFocused();
    await expect(
      page
        .getByText("Enter a valid email address.")
        .or(page.getByText("This field is required."))
        .first(),
    ).toBeVisible();
  });

  test("saves the quote and opens its private page with the server's price", async ({
    page,
  }, testInfo) => {
    const email = `e2e-quote-${testInfo.project.name}-${Date.now()}@example.com`;
    await open(page, "/en/quote?package=corporate-event");
    await page.getByLabel("Event date").fill(WEEKDAY);
    await page.getByLabel("Distance from Toronto (km)").fill("100");
    await expect(total(page)).toHaveText("$1,450.92 CAD");

    await page.getByLabel("Name").fill("E2E Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Get my quote" }).click();

    await expect(page).toHaveURL(/\/en\/quote\/CAD-Q-\d{4}-\d{4,}\?t=[\w-]{32}$/);
    const reference = page.url().match(/CAD-Q-\d{4}-\d{4,}/)![0];
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your estimate");
    await expect(page.getByText(`Quote ${reference}`)).toBeVisible();
    await expect(total(page)).toHaveText("$1,450.92 CAD");

    const [saved] = await queryDb<{
      totalCents: number;
      status: string;
      email: string;
      marketingOptIn: boolean;
    }>(
      `select q."totalCents", q.status, c.email, c."marketingOptIn"
         from "Quote" q join "Customer" c on c.id = q."customerId" where q.reference = $1`,
      [reference],
    );
    expect(saved).toMatchObject({
      totalCents: 145092,
      status: "SENT",
      email,
      marketingOptIn: false,
    });
  });
});
