import { describe, expect, it } from "vitest";

import { toEngineInput } from "@/lib/pricing/engine-input";

describe("toEngineInput", () => {
  const pkg = {
    category: "WEDDING",
    basePriceCents: 280000,
    includedHours: 8,
    includedShooters: 2,
  };

  it("maps validated quote details onto the engine input", () => {
    expect(
      toEngineInput(
        {
          category: "wedding",
          eventDate: "2027-06-12",
          startTime: "14:00",
          durationHours: 10,
          photographers: 2,
          guestCount: 120,
          province: "ON",
          distanceKm: 80,
          isInternational: false,
          addOns: [{ code: "DRONE", qty: 1 }],
        },
        pkg,
      ),
    ).toEqual({
      category: "WEDDING",
      pkg,
      eventDate: "2027-06-12",
      durationHours: 10,
      photographers: 2,
      guestCount: 120,
      province: "ON",
      distanceKm: 80,
      isInternational: false,
      addOns: [{ code: "DRONE", qty: 1 }],
    });
  });

  it("uses null for a missing distance", () => {
    const input = toEngineInput(
      {
        category: "wedding",
        eventDate: "2027-06-12",
        startTime: "14:00",
        durationHours: 8,
        photographers: 2,
        province: "INTL",
        isInternational: true,
        addOns: [],
      },
      pkg,
    );
    expect(input.distanceKm).toBeNull();
  });
});
