import { expect, test } from "@playwright/test";

import { queryDb } from "./db";

// Shared DB fixtures: one worker (serial); the mobile project ignores *-api specs.
test.describe.configure({ mode: "serial" });

const EMAIL = "e2e-cron@example.com";
const AUTH = { authorization: "Bearer e2e-cron-secret" };

const fixtures = [
  // reference suffix, hours since payment request (null = none), deposit paid?
  { ref: "CAD-B-9998-0001", requested: 49, paid: false }, // expired → released
  { ref: "CAD-B-9998-0002", requested: 1, paid: false }, // still within the hold
  { ref: "CAD-B-9998-0003", requested: null, paid: false }, // no request yet → never auto-expired
  { ref: "CAD-B-9998-0004", requested: 72, paid: true }, // deposit received → kept
];

async function cleanup() {
  await queryDb(`delete from "Booking" where reference like 'CAD-B-9998-%'`);
  await queryDb(`delete from "Customer" where email = $1`, [EMAIL]);
}

test.beforeAll(async () => {
  await cleanup();
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email) values (gen_random_uuid()::text, 'Cron Tester', $1) returning id`,
    [EMAIL],
  );
  for (const fixture of fixtures) {
    await queryDb(
      `insert into "Booking" (id, reference, category, "startAt", "endAt", photographers, status,
         "paymentRequestedAt", "depositPaidAt", "customerId", "updatedAt")
       values (gen_random_uuid()::text, $1, 'FAMILY', '2027-12-01 15:00', '2027-12-01 17:00', 1, 'PENDING',
         $2::timestamp, $3::timestamp, $4, now())`,
      [
        fixture.ref,
        // Stored as UTC wall time, like Prisma.
        fixture.requested === null
          ? null
          : new Date(Date.now() - fixture.requested * 3600_000).toISOString().replace("Z", ""),
        fixture.paid ? new Date().toISOString().replace("Z", "") : null,
        customer.id,
      ],
    );
  }
});

test.afterAll(cleanup);

test("rejects requests without the cron secret", async ({ request }) => {
  expect((await request.get("/api/cron/release-holds")).status()).toBe(401);
  expect(
    (
      await request.get("/api/cron/release-holds", { headers: { authorization: "Bearer nope" } })
    ).status(),
  ).toBe(401);
});

test("releases only unpaid holds past the payment window", async ({ request }) => {
  const response = await request.get("/api/cron/release-holds", { headers: AUTH });
  expect(response.ok()).toBe(true);
  const { released } = (await response.json()) as { released: string[] };
  expect(released.filter((ref) => ref.startsWith("CAD-B-9998-"))).toEqual(["CAD-B-9998-0001"]);

  const rows = await queryDb<{ reference: string; status: string }>(
    `select reference, status from "Booking" where reference like 'CAD-B-9998-%' order by reference`,
  );
  expect(rows).toEqual([
    { reference: "CAD-B-9998-0001", status: "CANCELLED" },
    { reference: "CAD-B-9998-0002", status: "PENDING" },
    { reference: "CAD-B-9998-0003", status: "PENDING" },
    { reference: "CAD-B-9998-0004", status: "PENDING" },
  ]);

  // Running again releases nothing new (idempotent).
  const again = (await (
    await request.get("/api/cron/release-holds", { headers: AUTH })
  ).json()) as {
    released: string[];
  };
  expect(again.released.filter((ref) => ref.startsWith("CAD-B-9998-"))).toEqual([]);
});
