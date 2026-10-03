import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const GLOBAL_SPECS = /\.global\.spec\.ts$/;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // The default (half the CPU cores = 8 here) intermittently crashed Windows test workers
  // (0xC0000409) once the suite passed ~450 tests; 6 is stable and only slightly slower.
  workers: process.env.CI ? undefined : 6,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: GLOBAL_SPECS,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      // API specs don't depend on the browser and share DB fixtures; run them once.
      testIgnore: [/-api\.spec\.ts$/, GLOBAL_SPECS],
    },
    {
      // Specs that change site-wide data (pricing rules, settings, approved reviews) would
      // break assertions in parallel specs, so they run once, after everything else.
      name: "global",
      use: { ...devices["Desktop Chrome"] },
      testMatch: GLOBAL_SPECS,
      dependencies: ["chromium", "mobile"],
    },
  ],
  webServer: {
    command: `node scripts/clear-data-cache.mjs && pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Seeded sample clients/reviews fill the home page sections under test.
    env: {
      SHOW_SAMPLE_CONTENT: "true",
      CRON_SECRET: "e2e-cron-secret",
      AUTH_SECRET: "e2e-auth-secret-not-for-production-use-0000",
    },
  },
});
