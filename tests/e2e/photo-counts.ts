/**
 * Expected counts for seeded content: fictional samples (prisma/seed-data.ts) plus the
 * owner's photos (src/data/photos.json, one project per group). Derived from the manifest so
 * the specs keep passing when `pnpm photos` publishes more work.
 */
import manifest from "../../src/data/photos.json";

const SAMPLE_IMAGES = { total: 25, WEDDING: 8 } as const;
const SAMPLE_PROJECTS = { total: 4, local: 3, WEDDING: 1, local2024: 1 } as const;

const groups = manifest.groups;
const imagesIn = (category?: string) =>
  groups
    .filter((group) => !category || group.category === category)
    .reduce((sum, group) => sum + group.images.length, 0);

export const galleryCounts = {
  total: SAMPLE_IMAGES.total + imagesIn(),
  wedding: SAMPLE_IMAGES.WEDDING + imagesIn("wedding"),
};

// Projects seeded from photos start as "Local" until the owner confirms reach.
export const portfolioCounts = {
  total: SAMPLE_PROJECTS.total + groups.length,
  local: SAMPLE_PROJECTS.local + groups.length,
  wedding: SAMPLE_PROJECTS.WEDDING + groups.filter((g) => g.category === "wedding").length,
  local2024: SAMPLE_PROJECTS.local2024 + groups.filter((g) => g.year === 2024).length,
};

export const heroSlideCount = manifest.hero.length;

/** "1 case study" / "3 case studies". */
export const caseStudies = (n: number) => `${n} ${n === 1 ? "case study" : "case studies"}`;
