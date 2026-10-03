import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

describe("list skeletons", () => {
  it("announce loading once and hide the placeholder blocks", () => {
    const html = renderToStaticMarkup(
      createElement(CardGridSkeleton, { label: "Chargement…", cards: 2 }),
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('<span class="sr-only">Chargement…</span>');
    // Every visual block is aria-hidden.
    const blocks = html.match(/data-slot="skeleton"/g) ?? [];
    const hidden =
      html.match(
        /aria-hidden="true" data-slot="skeleton"|data-slot="skeleton"[^>]*aria-hidden="true"/g,
      ) ?? [];
    expect(blocks.length).toBe(9);
    expect(hidden.length).toBe(blocks.length);
  });

  it("renders admin table rows", () => {
    const html = renderToStaticMarkup(createElement(TableSkeleton, { rows: 3 }));
    expect(html).toContain("Loading…");
    expect(html.match(/data-slot="skeleton"/g)).toHaveLength(5);
  });
});
