import { describe, expect, it } from "vitest";

import { lineItemLabel, type Translate } from "@/lib/pricing/line-labels";

// Echo translator: "key{json}" makes the chosen key and values visible.
const t: Translate = (key, values) => (values ? `${key}${JSON.stringify(values)}` : key);
const names = { packageName: "Wedding", addOnNames: { DRONE: "Drone coverage" } };

describe("lineItemLabel", () => {
  it.each([
    [{ kind: "base", amountCents: 1 }, 'lines.base{"name":"Wedding"}'],
    [{ kind: "extraHours", hours: 2, amountCents: 1 }, 'lines.extraHours{"hours":2}'],
    [
      { kind: "extraShooters", shooters: 1, hours: 8, amountCents: 1 },
      'lines.extraShooters{"count":1,"hours":8}',
    ],
    [
      { kind: "addOn", code: "DRONE", quantity: 1, amountCents: 1 },
      'lines.addOn{"name":"Drone coverage"}',
    ],
    [
      { kind: "addOn", code: "DRONE", quantity: 3, amountCents: 1 },
      'lines.addOnQty{"name":"Drone coverage","qty":3}',
    ],
    [
      { kind: "addOn", code: "UNKNOWN", quantity: 1, amountCents: 1 },
      'lines.addOn{"name":"UNKNOWN"}',
    ],
    [{ kind: "travel", km: 60, amountCents: 1 }, 'lines.travel{"km":60}'],
    [{ kind: "surcharge", code: "WEEKEND", amountCents: 1 }, "lines.WEEKEND"],
    [{ kind: "discount", code: "OFF_SEASON", amountCents: -1 }, "lines.OFF_SEASON"],
  ] as const)("%o", (item, expected) => {
    expect(lineItemLabel(item, t, names)).toBe(expected);
  });
});
