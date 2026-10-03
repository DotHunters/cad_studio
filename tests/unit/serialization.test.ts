import { describe, expect, it } from "vitest";

import { isSerializationFailure, withSerializableRetry } from "@/server/serialization";

// What the pg driver adapter throws for a serializable conflict (Prisma 7).
class DriverAdapterError extends Error {
  constructor(public cause: { kind: string }) {
    super(cause.kind);
    this.name = "DriverAdapterError";
  }
}

describe("isSerializationFailure", () => {
  it("recognizes conflicts from the pg adapter and from raw Postgres", () => {
    expect(
      isSerializationFailure(new DriverAdapterError({ kind: "TransactionWriteConflict" })),
    ).toBe(true);
    expect(
      isSerializationFailure(new Error("could not serialize access due to concurrent update")),
    ).toBe(true);
    expect(isSerializationFailure(new Error("40001"))).toBe(true);
  });

  it("leaves other errors alone", () => {
    expect(
      isSerializationFailure(new DriverAdapterError({ kind: "UniqueConstraintViolation" })),
    ).toBe(false);
    expect(isSerializationFailure(new Error("boom"))).toBe(false);
    expect(isSerializationFailure(null)).toBe(false);
  });
});

describe("withSerializableRetry", () => {
  it("retries conflicts, then succeeds", async () => {
    let calls = 0;
    const result = await withSerializableRetry(async () => {
      calls += 1;
      if (calls < 3) throw new DriverAdapterError({ kind: "TransactionWriteConflict" });
      return "saved";
    });
    expect([result, calls]).toEqual(["saved", 3]);
  });

  it("doesn't retry other errors", async () => {
    let calls = 0;
    await expect(
      withSerializableRetry(async () => {
        calls += 1;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(calls).toBe(1);
  });
});
