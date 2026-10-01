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
    // Fallback lets `prisma generate`/`validate` run without a database.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/cad_studio",
  },
});
