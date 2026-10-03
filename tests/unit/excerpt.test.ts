import { describe, expect, it } from "vitest";

import { excerpt } from "@/lib/seo/excerpt";

describe("excerpt", () => {
  it("strips Markdown and collapses whitespace", () => {
    expect(
      excerpt("## The brief\n\nA **two-day** summit with [Northwind](https://x.example).\n"),
    ).toBe("The brief A two-day summit with Northwind.");
  });

  it("keeps short text whole", () => {
    expect(excerpt("Short story.", 160)).toBe("Short story.");
  });

  it("cuts long text at a word boundary with an ellipsis", () => {
    const result = excerpt("word ".repeat(100), 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).toMatch(/word…$/);
  });
});
