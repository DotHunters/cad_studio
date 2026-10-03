// Prepares the e2e database: a separate `<dev db>_e2e` database on the same server, so test
// rows never show up in the dev admin. Creates it if missing, migrates and seeds it (the seed
// is idempotent). Run by playwright.config.ts before the test server is built.
import { execSync } from "node:child_process";

import { config } from "dotenv";
import { Client } from "pg";

config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.E2E_DATABASE_URL;
if (!url) throw new Error("E2E_DATABASE_URL is not set (playwright.config.ts sets it).");

const target = new URL(url);
const name = target.pathname.slice(1);
if (!/^[\w-]+$/.test(name)) throw new Error(`Unexpected e2e database name: ${name}`);

const admin = new URL(url);
admin.pathname = "/postgres";
const client = new Client({ connectionString: admin.toString() });
await client.connect();
try {
  const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [name]);
  if (!rowCount) await client.query(`create database "${name}"`);
} finally {
  await client.end();
}

const env = { ...process.env, DATABASE_URL: url };
execSync("pnpm -s prisma migrate deploy", { stdio: "inherit", env });
execSync("pnpm -s prisma db seed", { stdio: "inherit", env });
