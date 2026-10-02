// Lighthouse (mobile) on the main pages of a running site (AGENTS.md §10 targets: ≥ 90 in
// every category, LCP < 2.5 s, CLS < 0.1).
//
//   pnpm build && pnpm start --port 3300   # in another terminal
//   pnpm perf                              # or: BASE_URL=https://preview.example pnpm perf
//
// Needs Chrome: set CHROME_PATH, e.g. to Playwright's Chromium
// (%LOCALAPPDATA%\ms-playwright\chromium-*\chrome-win64\chrome.exe on Windows).
// Local results are pessimistic (no CDN/HTTP 2); measure a Vercel preview for real numbers.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3300";
const PAGES = [
  "/en",
  "/en/packages",
  "/en/portfolio",
  "/en/gallery",
  "/en/quote",
  "/en/book",
  "/en/reviews",
  "/en/about",
  "/en/contact",
  "/fr",
];
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const out = mkdtempSync(join(tmpdir(), "lighthouse-"));
const print = (line) => process.stdout.write(`${line}\n`);

print(`Lighthouse (mobile) on ${BASE_URL}\n`);
print("page            perf a11y best  seo   LCP     CLS    TBT");
for (const path of PAGES) {
  const file = join(out, `${path.replaceAll("/", "_")}.json`);
  execFileSync(
    process.execPath,
    [
      join("node_modules", "lighthouse", "cli", "index.js"),
      `${BASE_URL}${path}`,
      "--quiet",
      "--chrome-flags=--headless=new --no-sandbox",
      "--output=json",
      `--output-path=${file}`,
      `--only-categories=${CATEGORIES.join(",")}`,
    ],
    { stdio: "inherit" },
  );
  const report = JSON.parse(readFileSync(file, "utf8"));
  const score = (key) => String(Math.round(report.categories[key].score * 100)).padStart(4);
  const audit = (key) => report.audits[key].displayValue.padStart(7);
  print(
    `${path.padEnd(15)}${CATEGORIES.map(score).join(" ")} ${audit("largest-contentful-paint")} ${audit("cumulative-layout-shift")} ${audit("total-blocking-time")}`,
  );
}
