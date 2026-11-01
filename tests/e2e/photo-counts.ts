/**
 * Expected counts for seeded content: fictional samples (prisma/seed-data.ts) plus the
 * owner's photos (src/data/photos.json, one project per group). Derived from the manifest so
 * the specs keep passing when `pnpm photos` publishes more work.
 */
import manifest from "../../src/data/photos.json";

const SAMPLE_IMAGES = { total: 25 } as const;
const SAMPLE_PROJECTS = { total: 4, WEDDING: 1 } as const;

const groups = manifest.groups;
const imagesIn = () => groups.reduce((sum, group) => sum + group.images.length, 0);

export const galleryCounts = {
  total: SAMPLE_IMAGES.total + imagesIn(),
  // Owner photos inherit their group's tags; samples are tagged "sample" only.
  preShoot: groups
    .filter((group) => group.tags.includes("pre-shoot"))
    .reduce((sum, group) => sum + group.images.length, 0),
};

export const portfolioCounts = {
  total: SAMPLE_PROJECTS.total + groups.length,
  wedding: SAMPLE_PROJECTS.WEDDING + groups.filter((g) => g.category === "wedding").length,
};

export const heroSlideCount = manifest.hero.length;

/** "1 case study" / "3 case studies". */
export const caseStudies = (n: number) => `${n} ${n === 1 ? "case study" : "case studies"}`;
