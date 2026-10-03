import { expect, test } from "@playwright/test";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

// French completeness (task 8.6): French pages must not show English UI text. Catches strings
// hardcoded in components or rendered with the wrong locale.
function pairs(english: unknown, french: unknown): Array<[string, string]> {
  if (typeof english === "string") return [[english, String(french)]];
  if (english === null || typeof english !== "object") return [];
  return Object.entries(english).flatMap(([key, value]) =>
    pairs(value, (french as Record<string, unknown>)[key]),
  );
}

// Plain English sentences (no placeholders or tags) that have a different French version.
const ENGLISH_ONLY = pairs(en, fr)
  .filter(([english, french]) => english !== french && english.length >= 12)
  .filter(([english]) => !/[{<]/.test(english))
  .map(([english]) => english);

const PAGES = [
  "/fr",
  "/fr/packages",
  "/fr/packages/wedding",
  "/fr/portfolio",
  "/fr/portfolio/sample-northwind-annual-summit",
  "/fr/gallery",
  "/fr/quote",
  "/fr/book",
  "/fr/reviews",
  "/fr/about",
  "/fr/contact",
  "/fr/privacy",
  "/fr/terms",
  "/fr/does-not-exist",
];

for (const path of PAGES) {
  test(`${path} shows no English UI text`, async ({ page }) => {
    await page.goto(path);
    const text = await page.locator("body").innerText();
    const leaks = ENGLISH_ONLY.filter((english) => text.includes(english));
    expect(leaks, `English text on ${path}`).toEqual([]);
  });
}

test("control: the same scan does find English text on an English page", async ({ page }) => {
  expect(ENGLISH_ONLY.length).toBeGreaterThan(100);
  await page.goto("/en");
  const text = await page.locator("body").innerText();
  expect(ENGLISH_ONLY.filter((english) => text.includes(english)).length).toBeGreaterThan(5);
});
