import { expect, type Page, test } from "@playwright/test";

async function jsonLd(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((text) => JSON.parse(text) as Record<string, unknown>);
}

test.describe("SEO", () => {
  test("robots.txt blocks admin and API and points to the sitemap", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Disallow: /api");
    expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  });

  test("sitemap lists pages and packages with French alternates", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);
    const xml = await response.text();
    expect(xml).toContain("/en/packages/wedding</loc>");
    expect(xml).toContain("/en/privacy</loc>");
    expect(xml).toMatch(/hreflang="fr-CA"\s+href="[^"]+\/fr\/packages\/wedding"/);
  });

  test("home page has business structured data without a street address", async ({ page }) => {
    await page.goto("/en");
    const [business] = await jsonLd(page);
    expect(business["@type"]).toBe("ProfessionalService");
    expect(business.address).not.toHaveProperty("streetAddress");
  });

  test("package pages describe the service without placeholder prices", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    const [service] = await jsonLd(page);
    expect(service).toMatchObject({ "@type": "Service", name: "Wedding" });
    expect(service).not.toHaveProperty("offers");
  });

  test("about page describes the owner", async ({ page }) => {
    await page.goto("/en/about");
    const [person] = await jsonLd(page);
    expect(person).toMatchObject({ "@type": "Person", name: "I. Rukshan" });
  });

  test("pages have Open Graph tags with their own title", async ({ page }) => {
    await page.goto("/fr/packages");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Forfaits | Cad Studio",
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "fr_CA");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/brand\/og-default\.png$/,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });

  test("every page title follows the brand pattern", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page).toHaveTitle("Contact | Cad Studio — Photography in Canada");
  });

  test("gallery and case studies describe their images", async ({ page }) => {
    await page.goto("/en/gallery");
    const [gallery] = await jsonLd(page);
    expect(gallery["@type"]).toBe("ImageGallery");
    expect((gallery.image as unknown[]).length).toBe(25);

    await page.goto("/en/portfolio/sample-northwind-annual-summit");
    const [project] = await jsonLd(page);
    expect(project).toMatchObject({ "@type": "ImageGallery", name: "Annual Leadership Summit" });
    expect((project.image as unknown[]).length).toBe(6);
  });
});
