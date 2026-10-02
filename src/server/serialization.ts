import "server-only";

import { Prisma } from "@/generated/prisma/client";

/** Postgres serialization failure (40001) surfaced by Prisma — safe to retry. */
export function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return true;
  const text = String((error as { message?: string })?.message ?? error);
  return text.includes("40001") || /could not serialize access/i.test(text);
}

/** Runs a serializable unit of work, retrying serialization failures a few times. */
export async function withSerializableRetry<T>(work: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      if (!isSerializationFailure(error) || attempt >= attempts) throw error;
    }
  }
}
