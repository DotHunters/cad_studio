import { describe, expect, it } from "vitest";

import { buildIcs, escapeIcsText, foldIcsLine, formatIcsDate } from "@/lib/ics";

const event = {
  uid: "CAD-B-2026-0001@cadstudio.example",
  start: new Date("2027-06-12T18:00:00Z"),
  end: new Date("2027-06-13T02:00:00Z"),
  summary: "CAD Studio Photography — Wedding",
  description: "Reference CAD-B-2026-0001\nDeposit pending",
  location: "Casa Loma, Toronto",
  url: "https://cadstudio.example/en/book/CAD-B-2026-0001?t=abc",
  organizerName: "CAD Studio Photography",
  organizerEmail: "bookings@cadstudio.example",
  now: new Date("2026-10-02T12:00:00Z"),
};

describe("formatIcsDate", () => {
  it("writes UTC basic format", () => {
    expect(formatIcsDate(new Date("2027-06-12T18:00:00.123Z"))).toBe("20270612T180000Z");
  });
});

describe("escapeIcsText", () => {
  it("escapes backslashes, semicolons, commas and newlines", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("foldIcsLine", () => {
  it("leaves short lines alone", () => {
    expect(foldIcsLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds long lines at 75 octets with CRLF + space", () => {
    const folded = foldIcsLine(`DESCRIPTION:${"x".repeat(200)}`);
    const lines = folded.split("\r\n");
    expect(lines[0]).toHaveLength(75);
    for (const line of lines.slice(1)) {
      expect(line.startsWith(" ")).toBe(true);
      expect(line.length).toBeLessThanOrEqual(75);
    }
    expect(lines.map((line, index) => (index ? line.slice(1) : line)).join("")).toBe(
      `DESCRIPTION:${"x".repeat(200)}`,
    );
  });

  it("never splits a multi-byte character", () => {
    const folded = foldIcsLine(`SUMMARY:${"é".repeat(60)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(`SUMMARY:${"é".repeat(60)}`);
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(event);

  it("produces a CRLF-delimited VCALENDAR with one VEVENT", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.split("BEGIN:VEVENT")).toHaveLength(2);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("includes times in UTC, escaped text and a tentative status by default", () => {
    expect(ics).toContain("DTSTART:20270612T180000Z\r\n");
    expect(ics).toContain("DTEND:20270613T020000Z\r\n");
    expect(ics).toContain("LOCATION:Casa Loma\\, Toronto\r\n");
    expect(ics).toContain("DESCRIPTION:Reference CAD-B-2026-0001\\nDeposit pending\r\n");
    expect(ics).toContain("STATUS:TENTATIVE\r\n");
    expect(ics).toContain("UID:CAD-B-2026-0001@cadstudio.example\r\n");
  });

  it("omits optional fields when absent", () => {
    const minimal = buildIcs({
      ...event,
      description: undefined,
      location: undefined,
      url: undefined,
    });
    expect(minimal).not.toContain("DESCRIPTION:");
    expect(minimal).not.toContain("LOCATION:");
    expect(minimal).not.toContain("URL:");
  });
});
