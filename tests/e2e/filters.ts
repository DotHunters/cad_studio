import type { Locator } from "@playwright/test";

/**
 * Clicks a filter option inside a filter `nav`. On phones `FilterGroup` is a dropdown, so
 * the option is hidden until its menu is opened; on wider screens it's a visible chip.
 */
export async function pickFilter(nav: Locator, name: string) {
  const option = nav.getByRole("link", { name });
  if (!(await option.isVisible())) {
    await nav
      .locator("details")
      .filter({ has: nav.page().getByRole("link", { name, includeHidden: true }) })
      .locator("summary")
      .click();
  }
  await option.click();
}
