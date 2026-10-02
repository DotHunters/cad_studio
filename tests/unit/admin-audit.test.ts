import { describe, expect, it } from "vitest";

import { auditSummary, describeChanges } from "@/lib/admin/audit";

const money = (value: unknown) => `$${(Number(value) / 100).toFixed(2)}`;

describe("describeChanges", () => {
  const fields = {
    basePriceCents: { label: "price", format: money },
    isActive: { label: "active", format: (value: unknown) => (value ? "yes" : "no") },
    inclusions: { label: "inclusions" },
    name: { label: "name" },
  };

  it("lists only what changed, in field order", () => {
    expect(
      describeChanges(
        { basePriceCents: 280_000, isActive: true, inclusions: ["A"], name: "Wedding" },
        { basePriceCents: 300_000, isActive: false, inclusions: ["A"], name: "Wedding" },
        fields,
      ),
    ).toEqual(["price $2800.00 → $3000.00", "active yes → no"]);
  });

  it("compares lists by content and shows empties as a dash", () => {
    expect(
      describeChanges(
        { inclusions: [], name: "" },
        { inclusions: ["Album"], name: "Mini" },
        fields,
      ),
    ).toEqual(["inclusions — → Album", "name — → Mini"]);
  });
});

describe("auditSummary", () => {
  it("joins changes or says nothing changed", () => {
    expect(auditSummary("Wedding", ["price $1 → $2", "active yes → no"])).toBe(
      "Wedding: price $1 → $2; active yes → no",
    );
    expect(auditSummary("Wedding", [])).toBe("Wedding: no changes");
  });
});
