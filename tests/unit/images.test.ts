import { describe, expect, it } from "vitest";

import { placeholderImage } from "@/lib/images";

describe("placeholderImage", () => {
  it("builds a blank PNG by default (text colour matches background)", () => {
    expect(placeholderImage(800, 600)).toBe("https://placehold.co/800x600/1a1a1a/1a1a1a.png");
  });

  it("adds an optional label and background", () => {
    expect(placeholderImage(800, 600, { text: "Corporate Events", background: "262626" })).toBe(
      "https://placehold.co/800x600/262626/c79856.png?text=Corporate+Events&font=playfair-display",
    );
  });

  it("encodes special characters in the label", () => {
    expect(placeholderImage(10, 10, { text: "Événements & Co" })).toContain(
      "text=%C3%89v%C3%A9nements+%26+Co",
    );
  });
});
