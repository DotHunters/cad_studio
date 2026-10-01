import { expect, type Page, test } from "@playwright/test";

const heading = (page: Page) => page.locator("#booking-step-heading");
const next = (page: Page) => page.getByRole("button", { name: "Continue" });

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
}

/** Picks the first selectable day in the visible calendar month and returns its label. */
async function pickFirstAvailableDay(page: Page) {
  await expect(page.getByText("Checking availability…")).toHaveCount(0);
  const day = page.locator(".rdp-day:not(.rdp-disabled):not(.rdp-outside) button").first();
  await expect(day).toBeVisible();
  const label = await day.getAttribute("aria-label");
  await day.click();
  return label;
}

async function fillContact(page: Page) {
  await page.getByLabel("Name", { exact: true }).fill("Booking Tester");
  await page.getByLabel("Email", { exact: true }).fill("e2e-booking-wizard@example.com");
  await page.getByLabel(/Bank transfer/).check();
  await page.getByRole("checkbox", { name: /I agree to the terms of service/ }).check();
  await page.getByRole("checkbox", { name: /I've read the privacy policy/ }).check();
}

test.describe("booking wizard", () => {
  test("walks from a package to the review with the estimate and deposit", async ({ page }) => {
    await open(page, "/en/book?package=wedding");
    await expect(heading(page)).toHaveText("Service");
    await expect(page.getByLabel("Event type")).toHaveValue("wedding");
    await next(page).click();

    await expect(heading(page)).toHaveText("Date & time");
    await pickFirstAvailableDay(page);
    await expect(page.getByText(/^Selected: /)).toBeVisible();
    await page.getByLabel("Start time").selectOption("14:00");
    await page.getByLabel("End time").selectOption("22:00");
    await next(page).click();

    await expect(heading(page)).toHaveText("Event details");
    await expect(page.getByLabel("Photographers")).toHaveValue("2");
    await page.getByLabel("Venue (optional)").fill("Casa Loma");
    await next(page).click();

    await expect(heading(page)).toHaveText("Your details");
    await expect(page.getByRole("checkbox", { name: /Send me occasional news/ })).not.toBeChecked();
    await fillContact(page);
    await next(page).click();

    await expect(heading(page)).toHaveText("Review your booking");
    await expect(page.getByRole("main")).toContainText("Casa Loma");
    await expect(page.getByTestId("booking-deposit")).toContainText("30%");
  });

  test("validates each step before moving on", async ({ page }) => {
    await open(page, "/en/book");
    await next(page).click();
    await expect(heading(page)).toHaveText("Service");
    await expect(page.getByLabel("Event type")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Event type").selectOption("corporate");
    await next(page).click();
    await next(page).click();
    // No date chosen yet.
    await expect(heading(page)).toHaveText("Date & time");
    await expect(page.getByText("Choose an available date.")).toBeVisible();
  });

  test("rejects an end time before the start", async ({ page }) => {
    await open(page, "/en/book?package=corporate-event");
    await next(page).click();
    await pickFirstAvailableDay(page);
    await page.getByLabel("Start time").selectOption("18:00");
    await page.getByLabel("End time").selectOption("14:00");
    await next(page).click();
    await expect(page.getByText("The end time must be after the start time.")).toBeVisible();
  });

  test("goes back without losing answers", async ({ page }) => {
    await open(page, "/en/book?package=wedding");
    await next(page).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("Package")).toHaveValue("wedding");
  });

  test("ignores invalid quote links and prices fresh", async ({ page }) => {
    await open(page, "/en/book?quote=CAD-Q-2026-0001&t=" + "x".repeat(32));
    await expect(page.getByText("That quote link is invalid or has expired")).toBeVisible();
  });

  test("books from a quote, keeping the quoted price until details change", async ({ page }) => {
    // Create a quote first (Wednesday 9 June 2027, wedding, 8 h, 2 photographers).
    await open(page, "/en/quote?package=wedding");
    await page.getByLabel("Event date").fill("2027-06-09");
    await page.getByLabel("Name", { exact: true }).fill("Quote To Booking");
    await page.getByLabel("Email", { exact: true }).fill("e2e-quote-to-booking@example.com");
    await page.getByRole("button", { name: "Get my quote" }).click();
    await page.getByRole("link", { name: "Book this quote" }).click();

    await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
    await expect(page.getByText(/Booking from quote CAD-Q-/)).toBeVisible();
    await next(page).click();
    await expect(page.getByText(/Selected: Wednesday, June 9(th)?, 2027/)).toBeVisible();
    await expect(page.getByLabel("End time")).toHaveValue("22:00");
    await next(page).click();
    await next(page).click();
    await fillContact(page);
    await next(page).click();

    await expect(page.getByText(/Quoted price \(from CAD-Q-/)).toBeVisible();
    await expect(page.getByTestId("booking-total")).toHaveText("$3,164.00 CAD");

    // Changing a price-relevant detail drops the quoted price.
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByLabel("Photographers").fill("3");
    await next(page).click();
    await next(page).click();
    await expect(page.getByText(/Quoted price/)).toHaveCount(0);
    await expect(page.getByTestId("quote-total")).toBeVisible();
  });

  test("is localized in French", async ({ page }) => {
    await open(page, "/fr/book?package=wedding");
    await expect(page.locator("#booking-step-heading")).toHaveText("Service");
    await expect(page.getByRole("button", { name: "Continuer" })).toBeVisible();
  });
});
