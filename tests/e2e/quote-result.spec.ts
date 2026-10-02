import { expect, type Page, test } from "@playwright/test";

import { queryDb } from "./db";

const WEEKDAY = "2027-06-09";

async function createQuote(page: Page, email: string) {
  await page.goto("/en/quote?package=wedding");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Event date").fill(WEEKDAY);
  await page.getByLabel("Name").fill("Result Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Get my quote" }).click();
  await expect(page).toHaveURL(/\/quote\/CAD-Q-/);
  const url = new URL(page.url());
  return { reference: url.pathname.split("/").pop()!, token: url.searchParams.get("t")! };
}

const uniqueEmail = (label: string, project: string) =>
  `e2e-${label}-${project}-${Date.now()}@example.com`;

// AGENTS.md §15 scenario 1.
test("package → customize quote → change hours and photographers → submit → reference", async ({
  page,
}, testInfo) => {
  await page.goto("/en/packages/wedding");
  await page.getByRole("complementary").getByRole("link", { name: "Customize quote" }).click();
  await expect(page).toHaveURL(/\/en\/quote\?package=wedding$/);
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByLabel("Package")).toHaveValue("wedding");

  await page.getByLabel("Event date").fill(WEEKDAY);
  await expect(page.getByTestId("quote-total")).toHaveText("$3,164.00 CAD");
  await page.getByLabel("Hours of coverage").fill("10");
  await page.getByLabel("Photographers").fill("3");
  // $2,800 + 2 h × $200 + 1 extra × 10 h × $120 = $4,400 + 13% HST
  await expect(page.getByTestId("quote-total")).toHaveText("$4,972.00 CAD");

  await page.getByLabel("Name").fill("Scenario One");
  await page.getByLabel("Email").fill(uniqueEmail("s1", testInfo.project.name));
  await page.getByRole("button", { name: "Get my quote" }).click();
  await expect(page.getByText(/^Quote CAD-Q-\d{4}-\d{4,}$/)).toBeVisible();
  await expect(page.getByTestId("quote-total")).toHaveText("$4,972.00 CAD");
});

test.describe("private quote page", () => {
  test("offers booking with the signed quote", async ({ page }, testInfo) => {
    const { reference, token } = await createQuote(
      page,
      uniqueEmail("book", testInfo.project.name),
    );
    await expect(page.getByRole("link", { name: "Book this quote" })).toHaveAttribute(
      "href",
      `/en/book?quote=${reference}&t=${token}`,
    );
    await expect(page.getByText(/Valid until/)).toBeVisible();
  });

  test("is not reachable without a valid signature", async ({ page, request }, testInfo) => {
    const { reference, token } = await createQuote(page, uniqueEmail("sig", testInfo.project.name));
    expect((await request.get(`/en/quote/${reference}`)).status()).toBe(404);
    expect((await request.get(`/en/quote/${reference}?t=${"x".repeat(32)}`)).status()).toBe(404);

    // A valid signature for one quote doesn't open another (sequential references).
    const [year, sequence] = reference.split("-").slice(2);
    const neighbour = `CAD-Q-${year}-${String(Number(sequence) - 1).padStart(4, "0")}`;
    expect((await request.get(`/en/quote/${neighbour}?t=${token}`)).status()).toBe(404);
  });

  test("is never indexed", async ({ page }, testInfo) => {
    await createQuote(page, uniqueEmail("robots", testInfo.project.name));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("tells the client when the quote has expired", async ({ page }, testInfo) => {
    const { reference } = await createQuote(page, uniqueEmail("expired", testInfo.project.name));
    await queryDb(
      `update "Quote" set "expiresAt" = now() - interval '1 day' where reference = $1`,
      [reference],
    );
    await page.reload();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("This quote expired");
    await expect(page.getByRole("link", { name: "Book this quote" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Create a new quote" })).toBeVisible();
  });
});
