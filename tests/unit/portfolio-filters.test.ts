import { describe, expect, it } from "vitest";

import {
  filterProjects,
  parsePortfolioFilters,
  filterHref,
  projectPlace,
  projectYears,
} from "@/lib/portfolio-filters";

const projects = [
  { category: "WEDDING", reach: "LOCAL", year: 2025 },
  { category: "CORPORATE", reach: "LOCAL", year: 2025 },
  { category: "PRODUCT", reach: "GLOBAL", year: 2024 },
] as const;

describe("parsePortfolioFilters", () => {
  it("reads valid category, reach and year", () => {
    expect(parsePortfolioFilters({ category: "wedding", reach: "global", year: "2024" })).toEqual({
      category: "wedding",
      reach: "global",
      year: 2024,
    });
  });

  it("ignores invalid or repeated values", () => {
    expect(
      parsePortfolioFilters({ category: "pizza", reach: ["local", "global"], year: "20x4" }),
    ).toEqual({ category: null, reach: null, year: null });
  });
});

describe("filterProjects", () => {
  it("combines filters", () => {
    expect(filterProjects(projects, { category: null, reach: "local", year: 2025 })).toHaveLength(
      2,
    );
    expect(filterProjects(projects, { category: "product", reach: "global", year: null })).toEqual([
      projects[2],
    ]);
    expect(filterProjects(projects, { category: "wedding", reach: "global", year: null })).toEqual(
      [],
    );
  });

  it("returns everything with no filters", () => {
    expect(filterProjects(projects, { category: null, reach: null, year: null })).toHaveLength(3);
  });
});

describe("filterHref", () => {
  const current = { category: "wedding" as const, reach: "local" as const, year: 2025 };

  it("changes one filter and keeps the others", () => {
    expect(filterHref(current, { year: 2024 })).toEqual({
      pathname: "/portfolio",
      query: { category: "wedding", reach: "local", year: "2024" },
    });
  });

  it("drops a filter set to null", () => {
    expect(filterHref(current, { category: null })).toEqual({
      pathname: "/portfolio",
      query: { reach: "local", year: "2025" },
    });
  });
});

describe("projectPlace", () => {
  it("joins city and country, skipping blanks", () => {
    expect(projectPlace({ city: "Toronto", country: "Canada" })).toBe("Toronto, Canada");
    expect(projectPlace({ city: null, country: "Sri Lanka" })).toBe("Sri Lanka");
    expect(projectPlace({ city: null, country: "" })).toBe("");
  });
});

describe("projectYears", () => {
  it("lists distinct known years, newest first", () => {
    expect(projectYears([{ year: 2023 }, { year: null }, { year: 2025 }, { year: 2023 }])).toEqual([
      2025, 2023,
    ]);
  });
});

describe("filterProjects with unknown years", () => {
  it("keeps projects without a year unless a year is chosen", () => {
    const list = [{ category: "WEDDING", reach: "LOCAL", year: null }] as const;
    expect(filterProjects(list, { category: null, reach: null, year: null })).toHaveLength(1);
    expect(filterProjects(list, { category: null, reach: null, year: 2024 })).toHaveLength(0);
  });
});
