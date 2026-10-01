import { expect, test } from "@playwright/test";

import { queryDb } from "./db";

// Shared DB fixtures: one worker (serial); the mobile project ignores *-api specs.
test.describe.configure({ mode: "serial" });

const MONTH = "2027-09";
const EMAIL = "e2e-availability@example.com";

async function cleanup() {
  await queryDb(`delete from "Booking" where reference like 'E2E-AVAIL-%'`);
  await queryDb(`delete from "Customer" where email = $1`, [EMAIL]);
  await queryDb(`delete from "BlockedDate" where date = '2027-09-14'`);
}

test.beforeAll(async () => {
  await cleanup();
  await queryDb(
    `insert into "BlockedDate" (id, date, reason) values (gen_random_uuid()::text, '2027-09-14', 'e2e')`,
  );
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email) values (gen_random_uuid()::text, 'Availability Test', $1) returning id`,
    [EMAIL],
  );
  // Prisma stores DateTime as UTC wall time in a `timestamp` column, so convert explicitly —
  // the DB session time zone (e.g. Asia/Colombo) must not leak into the stored value.
  const booking = (reference: string, localStart: string, photographers: number, status: string) =>
    queryDb(
      `insert into "Booking" (id, reference, category, "startAt", "endAt", photographers, status, "customerId", "updatedAt")
       values (gen_random_uuid()::text, $1, 'WEDDING',
               (($2::timestamp at time zone 'America/Toronto') at time zone 'UTC'),
               (($2::timestamp at time zone 'America/Toronto') at time zone 'UTC') + interval '4 hours',
               $3, $4::"BookingStatus", $5, now())`,
      [reference, localStart, photographers, status, customer.id],
    );
  await booking("E2E-AVAIL-1", "2027-09-15 18:00", 2, "CONFIRMED");
  // 11:30 PM in Toronto is the next day in UTC — must still count for the 16th.
  await booking("E2E-AVAIL-2", "2027-09-16 23:30", 3, "PENDING");
  // Cancelled bookings don't hold capacity.
  await booking("E2E-AVAIL-3", "2027-09-17 12:00", 3, "CANCELLED");
});

test.afterAll(cleanup);

test("returns one public status per day and nothing else", async ({ request }) => {
  const response = await request.get(`/api/availability?month=${MONTH}`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { month: string; days: Array<Record<string, unknown>> };

  expect(body.month).toBe(MONTH);
  expect(body.days).toHaveLength(30);
  for (const day of body.days) expect(Object.keys(day).sort()).toEqual(["date", "status"]);

  const status = (date: string) => body.days.find((day) => day.date === date)?.status;
  expect(status("2027-09-14")).toBe("full"); // blocked — reason not exposed
  expect(status("2027-09-15")).toBe("limited"); // 2 of 3 photographers booked
  expect(status("2027-09-16")).toBe("full"); // late-evening booking in studio time
  expect(status("2027-09-17")).toBe("available"); // cancelled booking ignored
  expect(status("2027-09-18")).toBe("available");
});

test("rejects malformed and out-of-range months", async ({ request }) => {
  for (const month of ["2027-9", "abc", "2020-01", "2035-01", ""]) {
    expect((await request.get(`/api/availability?month=${month}`)).status()).toBe(400);
  }
});
