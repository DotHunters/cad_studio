import { describe, expect, it } from "vitest";

import { counterKey, formatReference, parseReference } from "@/lib/references";

describe("references", () => {
  it("formats CAD-Q/B-YYYY-#### with zero padding", () => {
    expect(formatReference("Q", 2026, 1)).toBe("CAD-Q-2026-0001");
    expect(formatReference("B", 2027, 42)).toBe("CAD-B-2027-0042");
  });

  it("keeps growing past 9999 without truncating", () => {
    expect(formatReference("Q", 2026, 12345)).toBe("CAD-Q-2026-12345");
  });

  it("builds per-type, per-year counter keys", () => {
    expect(counterKey("Q", 2026)).toBe("Q-2026");
  });

  it("parses references back and rejects anything else", () => {
    expect(parseReference("CAD-Q-2026-0007")).toEqual({ type: "Q", year: 2026, sequence: 7 });
    expect(parseReference("cad-q-2026-0007")).toBeNull();
    expect(parseReference("CAD-X-2026-0007")).toBeNull();
    expect(parseReference("CAD-Q-2026-7")).toBeNull();
  });
});
