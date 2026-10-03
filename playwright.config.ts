import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

// e2e tests use their own database (`<dev db>_e2e`, created and seeded by scripts/e2e-db.mjs)
// and build folder, so they never touch dev data or a running `pnpm dev`.
const devDatabase = new URL(process.env.DATABASE_URL ?? "postgresql://localhost:5432/cad_studio");
devDatabase.pathname = `${devDatabase.pathname}_e2e`;
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? devDatabase.toString();
// Test files (tests/e2e/db.ts) read DATABASE_URL; dotenv there won't override this.
process.env.DATABASE_URL = E2E_DATABASE_URL;
process.env.E2E_DATABASE_URL = E2E_DATABASE_URL;
const NEXT_DIST_DIR = ".next-e2e";

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
    command: `node scripts/e2e-db.mjs && node scripts/clear-data-cache.mjs && pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Seeded sample clients/reviews fill the home page sections under test.
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      DATABASE_URL_UNPOOLED: E2E_DATABASE_URL,
      E2E_DATABASE_URL,
      NEXT_DIST_DIR,
      // Never write to the real photo store from tests (overrides .env.local).
      BLOB_READ_WRITE_TOKEN: "",
      SHOW_SAMPLE_CONTENT: "true",
      CRON_SECRET: "e2e-cron-secret",
      AUTH_SECRET: "e2e-auth-secret-not-for-production-use-0000",
      // Must match tests/e2e/admin-auth.spec.ts.
      SUPER_ADMIN_EMAIL: "e2e-super-admin@example.com",
      SUPER_ADMIN_PASSWORD: "e2e super admin password",
    },
  },
});
