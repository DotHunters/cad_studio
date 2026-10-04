// Runs `prisma migrate deploy` for Vercel builds, after clearing a stale migration lock.
//
// Prisma takes a Postgres advisory lock while migrating. If a run went through Neon's pooler
// (or was killed mid-way), the connection holding that lock can stay open after the build
// ends, and every later deploy times out with P1002. A connection that has held the lock
// while sitting idle for minutes isn't migrating any more, so it's ended first.
import { execSync } from "node:child_process";

import { config } from "dotenv";
import { Client } from "pg";

config({ path: [".env.local", ".env"], quiet: true });

/** Prisma's fixed advisory-lock key (see https://pris.ly/d/migrate-advisory-locking). */
const PRISMA_LOCK_KEY = 72707369;
const STALE_AFTER_MINUTES = Number(process.env.MIGRATION_LOCK_STALE_MINUTES ?? 5);

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const client = new Client({ connectionString: url });
await client.connect();
try {
  const { rows } = await client.query(
    `select a.pid, a.state, a.application_name,
            extract(epoch from (now() - a.state_change)) / 60 as idle_minutes
       from pg_locks l join pg_stat_activity a using (pid)
      where l.locktype = 'advisory' and l.objid = $1 and l.granted and a.pid <> pg_backend_pid()`,
    [PRISMA_LOCK_KEY],
  );
  for (const row of rows) {
    const stale = row.state !== "active" && row.idle_minutes >= STALE_AFTER_MINUTES;
    const minutes = Number(row.idle_minutes).toFixed(1);
    if (stale) {
      await client.query("select pg_terminate_backend($1)", [row.pid]);
      process.stdout.write(
        `migrate: ended a stale migration lock (pid ${row.pid}, ${row.state} for ${minutes} min)\n`,
      );
    } else {
      process.stdout.write(
        `migrate: migration lock held by pid ${row.pid} (${row.state}, ${minutes} min) — another migration may be running\n`,
      );
    }
  }
} finally {
  await client.end();
}

execSync("prisma migrate deploy", { stdio: "inherit" });
