import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local; mirror that for the Prisma CLI.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations take a Postgres advisory lock, which needs a direct connection: on Neon use
    // the unpooled URL (the Vercel integration sets DATABASE_URL_UNPOOLED). The app itself
    // keeps using the pooled DATABASE_URL (src/lib/db.ts). The fallback lets
    // `prisma generate`/`validate` run without a database.
    url:
      // `||`, not `??`: an empty value (e.g. copied from .env.example) must fall through.
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL ||
      "postgresql://localhost:5432/cad_studio",
  },
});
