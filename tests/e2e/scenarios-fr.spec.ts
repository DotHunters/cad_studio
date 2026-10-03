import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { queryDb } from "./db";

// AGENTS.md §15 key scenarios, in French (task 8.5b). The English versions live in the
// feature specs; scenario 7 (admin sign-in) and the admin half of 5 are English-only screens.

const emailFor = (testInfo: TestInfo) =>
  `e2e-fr-${testInfo.project.name}-${testInfo.testId}@example.com`.toLowerCase();
const total = (page: Page) => page.getByTestId("quote-total");
const next = (page: Page) => page.getByRole("button", { name: "Continuer" });

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
}

/** A date key N days after today in the studio's time zone. */
function studioDatePlus(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(
    new Date(),
  );
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

test.afterEach(async ({}, testInfo) => {
  const email = emailFor(testInfo);
  await queryDb(
    `delete from "Booking" where "customerId" in (select id from "Customer" where email = $1)`,
    [email],
  );
  await queryDb(
    `delete from "Quote" where "customerId" in (select id from "Customer" where email = $1)`,
    [email],
  );
  await queryDb(`delete from "Review" where "authorName" = $1`, [`Avis FR ${testInfo.testId}`]);
});

test.describe("scénarios clés en français", () => {
  // Scenario 1: package → customize quote → prefilled → change hours → total updates → reference.
  test("forfait → devis personnalisé → référence", async ({ page }, testInfo) => {
    await page.goto("/fr/packages/wedding");
    await page.getByRole("link", { name: "Personnaliser le devis" }).first().click();
    await expect(page).toHaveURL(/\/fr\/quote\?package=wedding/);
    await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
    await expect(page.getByLabel("Type d’événement")).toHaveValue("wedding");

    await page.getByLabel("Date de l’événement").fill("2027-06-09");
    // 2 800 $ + 13 % TVH, in Canadian French currency format.
    await expect(total(page)).toHaveText(/^3\s164,00\s\$/);
    await page.getByLabel("Heures de couverture").fill("10");
    await expect(total(page)).toHaveText(/^3\s616,00\s\$/);

    await page.getByLabel("Nom", { exact: true }).fill("Client Test");
    await page.getByLabel("Courriel", { exact: true }).fill(emailFor(testInfo));
    await page.getByRole("button", { name: "Obtenir mon devis" }).click();
    await expect(page).toHaveURL(/\/fr\/quote\/CAD-Q-\d{4}-\d{4,}\?t=/);
    await expect(page.getByText(/CAD-Q-\d{4}-\d{4,}/).first()).toBeVisible();
  });

  // Scenario 2: book the quote → date's capacity decreases.
  test("réserver le devis → la capacité du jour diminue", async ({ page, request }, testInfo) => {
    // Wednesdays the English booking spec doesn't use; one per project.
    const date = testInfo.project.name === "mobile" ? "2027-06-30" : "2027-06-23";
    await queryDb(
      `delete from "Booking" where "startAt"::date between $1::date and $1::date + 1
         and "customerId" in (select id from "Customer" where email like 'e2e-%')`,
      [date],
    );
    const status = async () => {
      const body = (await (await request.get("/api/availability?month=2027-06")).json()) as {
        days: Array<{ date: string; status: string }>;
      };
      return body.days.find((day) => day.date === date)?.status;
    };
    expect(await status()).toBe("available");

    await open(page, "/fr/quote?package=wedding");
    await page.getByLabel("Date de l’événement").fill(date);
    await page.getByLabel("Nom", { exact: true }).fill("Client Test");
    await page.getByLabel("Courriel", { exact: true }).fill(emailFor(testInfo));
    await page.getByRole("button", { name: "Obtenir mon devis" }).click();
    await page.getByRole("link", { name: "Réserver ce devis" }).click();
    await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
    for (let step = 0; step < 3; step++) await next(page).click();
    await page.getByLabel("Nom", { exact: true }).fill("Client Test");
    await page.getByLabel("Courriel", { exact: true }).fill(emailFor(testInfo));
    await page.getByLabel(/Virement bancaire/).check();
    await page.getByRole("checkbox", { name: /J’accepte les conditions d’utilisation/ }).check();
    await page.getByRole("checkbox", { name: /J’ai lu la politique de confidentialité/ }).check();
    await next(page).click();
    await page.getByRole("button", { name: "Demander la réservation" }).click();

    await expect(page).toHaveURL(/\/fr\/book\/CAD-B-\d{4}-\d{4,}/);
    await expect.poll(status).toBe("limited");
    const [customer] = await queryDb<{ locale: string }>(
      `select locale from "Customer" where email = $1`,
      [emailFor(testInfo)],
    );
    // French clients get their emails in French.
    expect(customer.locale).toBe("fr");
  });

  // Scenario 4: a blocked date isn't selectable.
  test("une date bloquée n’est pas sélectionnable", async ({ page }, testInfo) => {
    const date = studioDatePlus(testInfo.project.name === "mobile" ? 13 : 12);
    await queryDb(`delete from "BlockedDate" where date = $1::date`, [date]);
    await queryDb(
      `insert into "BlockedDate" (id, date, reason) values (gen_random_uuid()::text, $1::date, 'e2e fr')`,
      [date],
    );
    try {
      await open(page, "/fr/book?package=family-event");
      await next(page).click();
      await expect(page.getByText("Vérification des disponibilités…")).toHaveCount(0);
      const cell = page.locator(`[data-day="${date}"]`);
      if (
        (await cell.count()) === 0 ||
        (await cell.getAttribute("class"))?.includes("rdp-outside")
      ) {
        // The calendar's own labels are French too.
        await page.getByRole("button", { name: "Aller au mois suivant" }).click();
        await expect(page.getByText("Vérification des disponibilités…")).toHaveCount(0);
      }
      await expect(page.locator(`[data-day="${date}"]:not(.rdp-outside) button`)).toBeDisabled();
    } finally {
      await queryDb(`delete from "BlockedDate" where date = $1::date`, [date]);
    }
  });

  // Scenario 5 (public half): a submitted review isn't published.
  test("un avis envoyé n’est pas publié avant approbation", async ({ page }, testInfo) => {
    const name = `Avis FR ${testInfo.testId}`;
    const body = "Une séance familiale chaleureuse, des photos magnifiques.";
    await open(page, "/fr/reviews");
    const form = page.locator("#share");
    await form.locator("label", { has: page.getByRole("radio", { name: "5 étoiles" }) }).click();
    await form.getByLabel("Votre nom").fill(name);
    await form.getByLabel("Votre avis").fill(body);
    await form
      .getByRole("checkbox", { name: /J’accepte que CAD Studio Photography publie cet avis/ })
      .check();
    await form.getByRole("button", { name: "Envoyer l’avis" }).click();
    await expect(form.getByRole("status")).toContainText("Merci");

    const [review] = await queryDb<{ status: string; locale: string }>(
      `select status, locale from "Review" where "authorName" = $1`,
      [name],
    );
    expect(review).toEqual({ status: "PENDING", locale: "fr" });
    await page.reload();
    await expect(page.getByText(body)).toHaveCount(0);
  });

  // Scenario 6: the gallery lightbox works with the keyboard.
  test("la visionneuse de la galerie fonctionne au clavier", async ({ page }) => {
    await page.goto("/fr/gallery");
    const first = page.getByRole("button", { name: /^Ouvrir l’image 1 sur/ });
    await first.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Visionneuse d’images" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Fermer" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(dialog).toContainText(/^.*2 \/ \d+/);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(first).toBeFocused();
  });
});
