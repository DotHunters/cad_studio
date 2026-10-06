/**
 * Seed data (AGENTS.md §8.1, §8.2, §13). Every value here is a starting point the owner
 * edits in the admin dashboard — nothing here may be hardcoded in components.
 *
 * TODO(owner-fr): review — all French (`*Fr`) text was drafted by an agent.
 * Sample clients/reviews are fictional, flagged `isSample`, and hidden in production
 * (SHOW_SAMPLE_CONTENT=false).
 */
import type { AddOnUnit, Reach, ReviewType } from "../src/generated/prisma/client";

const dollars = (amount: number) => Math.round(amount * 100);

export type PackageSeed = {
  slug: string;
  category: string; // service slug
  name: string;
  nameFr: string;
  summary: string;
  summaryFr: string;
  description: string;
  descriptionFr: string;
  basePriceCents: number;
  includedHours: number;
  includedShooters: number;
  editedImages: number | null;
  turnaroundDays: number | null;
  inclusions: string[];
  inclusionsFr: string[];
  exclusions: string[];
  exclusionsFr: string[];
  sortOrder: number;
};

export const packages: PackageSeed[] = [
  {
    slug: "corporate-event",
    category: "corporate",
    name: "Corporate Event",
    nameFr: "Événement corporatif",
    summary: "Conferences, launches, galas and on-site headshots.",
    summaryFr: "Conférences, lancements, galas et portraits sur place.",
    description:
      "Coverage of your conference, product launch or gala — keynotes, networking, branding and candid moments, delivered ready for press and social.",
    descriptionFr:
      "Couverture de votre conférence, lancement de produit ou gala — conférenciers, réseautage, image de marque et moments spontanés, livrés prêts pour la presse et les réseaux sociaux.",
    basePriceCents: dollars(1200),
    includedHours: 4,
    includedShooters: 1,
    editedImages: 150,
    turnaroundDays: 7,
    inclusions: ["4 hours of coverage", "1 photographer", "150+ edited images", "Online gallery"],
    inclusionsFr: [
      "4 heures de couverture",
      "1 photographe",
      "150+ images retouchées",
      "Galerie en ligne",
    ],
    exclusions: ["Travel beyond 40 km", "Printed products"],
    exclusionsFr: ["Déplacements au-delà de 40 km", "Produits imprimés"],
    sortOrder: 1,
  },
  {
    slug: "wedding",
    category: "wedding",
    name: "Wedding",
    nameFr: "Mariage",
    summary: "Engagement, ceremony and reception — the whole story.",
    summaryFr: "Fiançailles, cérémonie et réception — toute l'histoire.",
    description:
      "Two photographers capture your day from getting ready to the last dance, with a calm, organized approach shaped by years of event management.",
    descriptionFr:
      "Deux photographes capturent votre journée, des préparatifs à la dernière danse, avec une approche calme et organisée façonnée par des années de gestion d'événements.",
    basePriceCents: dollars(2800),
    includedHours: 8,
    includedShooters: 2,
    editedImages: 500,
    turnaroundDays: 42,
    inclusions: [
      "8 hours of coverage",
      "2 photographers",
      "500+ edited images",
      "Online gallery",
      "Planning consultation",
    ],
    inclusionsFr: [
      "8 heures de couverture",
      "2 photographes",
      "500+ images retouchées",
      "Galerie en ligne",
      "Consultation de planification",
    ],
    exclusions: ["Printed album (add-on)", "Travel beyond 40 km"],
    exclusionsFr: ["Album imprimé (option)", "Déplacements au-delà de 40 km"],
    sortOrder: 2,
  },
  {
    slug: "family-event",
    category: "family",
    name: "Family Event",
    nameFr: "Événement familial",
    summary: "Birthdays, anniversaries, baby showers and milestones.",
    summaryFr: "Anniversaires, fêtes prénatales et grandes étapes.",
    description:
      "Relaxed coverage of the moments that matter to your family, with guidance for group photos so nobody is missed.",
    descriptionFr:
      "Une couverture détendue des moments qui comptent pour votre famille, avec un accompagnement pour les photos de groupe afin que personne ne soit oublié.",
    basePriceCents: dollars(600),
    includedHours: 2,
    includedShooters: 1,
    editedImages: 80,
    turnaroundDays: 14,
    inclusions: ["2 hours of coverage", "1 photographer", "80+ edited images", "Online gallery"],
    inclusionsFr: [
      "2 heures de couverture",
      "1 photographe",
      "80+ images retouchées",
      "Galerie en ligne",
    ],
    exclusions: ["Travel beyond 40 km"],
    exclusionsFr: ["Déplacements au-delà de 40 km"],
    sortOrder: 3,
  },
  {
    slug: "gathering",
    category: "gathering",
    name: "Gathering",
    nameFr: "Rassemblement",
    summary: "Community, cultural, religious and social events.",
    summaryFr: "Événements communautaires, culturels, religieux et sociaux.",
    description:
      "Respectful, unobtrusive coverage of community and cultural events, attentive to traditions and the people who make them.",
    descriptionFr:
      "Une couverture respectueuse et discrète des événements communautaires et culturels, attentive aux traditions et aux personnes qui les font vivre.",
    basePriceCents: dollars(750),
    includedHours: 3,
    includedShooters: 1,
    editedImages: 120,
    turnaroundDays: 14,
    inclusions: ["3 hours of coverage", "1 photographer", "120+ edited images", "Online gallery"],
    inclusionsFr: [
      "3 heures de couverture",
      "1 photographe",
      "120+ images retouchées",
      "Galerie en ligne",
    ],
    exclusions: ["Travel beyond 40 km"],
    exclusionsFr: ["Déplacements au-delà de 40 km"],
    sortOrder: 4,
  },
  {
    slug: "professional-photoshoot",
    category: "professional",
    name: "Professional Photoshoot",
    nameFr: "Séance photo professionnelle",
    summary: "Portraits, headshots, personal branding and portfolios.",
    summaryFr: "Portraits, photos professionnelles, image de marque et portfolios.",
    description:
      "A guided session for headshots, personal branding or model portfolios, with posing direction and retouched finals.",
    descriptionFr:
      "Une séance guidée pour portraits professionnels, image de marque personnelle ou portfolios de mannequins, avec direction de pose et retouches finales.",
    basePriceCents: dollars(350),
    includedHours: 1,
    includedShooters: 1,
    editedImages: 15,
    turnaroundDays: 7,
    inclusions: ["1 hour session", "15 retouched images", "Online gallery"],
    inclusionsFr: ["Séance d'une heure", "15 images retouchées", "Galerie en ligne"],
    exclusions: ["Hair and makeup", "Studio rental outside our space"],
    exclusionsFr: ["Coiffure et maquillage", "Location de studio externe"],
    sortOrder: 5,
  },
  {
    slug: "product-photography",
    category: "product",
    name: "Product Photography",
    nameFr: "Photographie de produits",
    summary: "E-commerce, catalogue, lifestyle and flat-lay.",
    summaryFr: "Commerce en ligne, catalogue, mise en situation et vue de dessus.",
    description:
      "Clean, consistent product images for your store and catalogue. Includes 10 products; add more per item.",
    descriptionFr:
      "Des images de produits nettes et cohérentes pour votre boutique et votre catalogue. Comprend 10 produits; ajoutez-en d'autres à l'unité.",
    basePriceCents: dollars(400),
    includedHours: 2,
    includedShooters: 1,
    editedImages: 10,
    turnaroundDays: 7,
    inclusions: ["10 products", "1 edited image per product", "White-background or lifestyle"],
    inclusionsFr: [
      "10 produits",
      "1 image retouchée par produit",
      "Fond blanc ou mise en situation",
    ],
    exclusions: ["Props and styling", "Shipping of products"],
    exclusionsFr: ["Accessoires et stylisme", "Expédition des produits"],
    sortOrder: 6,
  },
];

export type AddOnSeed = {
  code: string;
  name: string;
  nameFr: string;
  priceCents: number;
  unit: AddOnUnit;
  categories: string[];
  sortOrder: number;
};

const EVENT_CATEGORIES: string[] = ["corporate", "wedding", "family", "gathering"];
const ALL_CATEGORIES: string[] = [...EVENT_CATEGORIES, "professional", "product"];

export const addOns: AddOnSeed[] = [
  {
    code: "VIDEO",
    name: "Videographer",
    nameFr: "Vidéaste",
    priceCents: dollars(150),
    unit: "PER_HOUR",
    categories: EVENT_CATEGORIES,
    sortOrder: 1,
  },
  {
    code: "DRONE",
    name: "Drone coverage",
    nameFr: "Prises de vue par drone",
    priceCents: dollars(300),
    unit: "FLAT",
    categories: EVENT_CATEGORIES,
    sortOrder: 2,
  },
  {
    code: "PHOTO_BOOTH",
    name: "Photo booth",
    nameFr: "Photomaton",
    priceCents: dollars(450),
    unit: "FLAT",
    categories: EVENT_CATEGORIES,
    sortOrder: 3,
  },
  {
    code: "ALBUM",
    name: "Printed album",
    nameFr: "Album imprimé",
    priceCents: dollars(450),
    unit: "FLAT",
    categories: ["wedding", "family", "gathering"],
    sortOrder: 4,
  },
  {
    code: "RUSH",
    name: "Rush 72-hour delivery",
    nameFr: "Livraison express en 72 heures",
    priceCents: dollars(250),
    unit: "FLAT",
    categories: ALL_CATEGORIES,
    sortOrder: 5,
  },
  {
    code: "EXTRA_PRODUCT",
    name: "Extra product image",
    nameFr: "Image de produit supplémentaire",
    priceCents: dollars(25),
    unit: "PER_ITEM",
    categories: ["product"],
    sortOrder: 6,
  },
  {
    code: "EDITED_PACK",
    name: "Additional edited images pack",
    nameFr: "Forfait d'images retouchées supplémentaires",
    priceCents: dollars(150),
    unit: "FLAT",
    categories: ALL_CATEGORIES,
    sortOrder: 7,
  },
];

/** Quote engine and booking knobs. Money in CAD cents, percentages as whole numbers. */
export const pricingRules: Record<string, number> = {
  EXTRA_HOUR_RATE: dollars(200),
  EXTRA_SHOOTER_HOURLY: dollars(120),
  FREE_TRAVEL_KM: 40,
  TRAVEL_PER_KM: dollars(0.7),
  MAX_AUTO_TRAVEL_KM: 300,
  WEEKEND_SURCHARGE_PCT: 10,
  STAT_HOLIDAY_SURCHARGE_PCT: 25,
  DEPOSIT_PCT: 30,
  QUOTE_VALID_DAYS: 14,
  GUESTS_PER_PHOTOGRAPHER_HINT: 100,
  MAX_PHOTOGRAPHERS_PER_DAY: 3,
  MIN_LEAD_DAYS: 3,
  PENDING_HOLD_HOURS: 48,
};

export type TaxRateSeed = {
  province: string;
  gst: string;
  pst: string;
  hst: string;
  label: string;
};

// Verify current rates and service applicability with the studio's accountant before launch.
// BC/MB/SK: PST applicability to photography services is unconfirmed (Q10) — GST only for now.
export const taxRates: TaxRateSeed[] = [
  ...["AB", "NT", "NU", "YT", "BC", "MB", "SK"].map((province) => ({
    province,
    gst: "0.05",
    pst: "0",
    hst: "0",
    label: "GST",
  })),
  { province: "QC", gst: "0.05", pst: "0.09975", hst: "0", label: "GST + QST" },
  { province: "ON", gst: "0", pst: "0", hst: "0.13", label: "HST" },
  { province: "NS", gst: "0", pst: "0", hst: "0.14", label: "HST" },
  ...["NB", "NL", "PE"].map((province) => ({
    province,
    gst: "0",
    pst: "0",
    hst: "0.15",
    label: "HST",
  })),
  // Outside Canada: verify place-of-supply rules.
  { province: "INTL", gst: "0", pst: "0", hst: "0", label: "No Canadian tax" },
];

export const siteSettings: Record<string, { en: string; fr: string }> = {
  CANCELLATION_POLICY: {
    en: "TODO(owner): cancellation policy.",
    fr: "TODO(owner): politique d'annulation.",
  },
  PAYMENT_INSTRUCTIONS: {
    en: "TODO(owner): bank transfer details.",
    fr: "TODO(owner): coordonnées pour le virement bancaire.",
  },
};

/** Placeholder images use the `placeholder/` prefix; the image loader renders them via placehold.co. */
export type SampleProjectSeed = {
  slug: string;
  title: string;
  titleFr: string;
  clientName: string;
  category: string; // service slug
  reach: Reach;
  city: string;
  country: string;
  year: number;
  story: string;
  storyFr: string;
  featured: boolean;
  imageCount: number;
};

export const sampleProjects: SampleProjectSeed[] = [
  {
    slug: "sample-northwind-annual-summit",
    title: "Annual Leadership Summit",
    titleFr: "Sommet annuel de leadership",
    clientName: "Northwind Corp (Sample)",
    category: "corporate",
    reach: "LOCAL",
    city: "Toronto",
    country: "Canada",
    year: 2025,
    story: "[SAMPLE] Fictional case study used for layout until real projects are added.",
    storyFr: "[EXEMPLE] Étude de cas fictive utilisée pour la mise en page.",
    featured: true,
    imageCount: 6,
  },
  {
    slug: "sample-maple-co-garden-wedding",
    title: "Garden Wedding",
    titleFr: "Mariage au jardin",
    clientName: "Maple & Co. Events (Sample)",
    category: "wedding",
    reach: "LOCAL",
    city: "Markham",
    country: "Canada",
    year: 2025,
    story: "[SAMPLE] Fictional case study used for layout until real projects are added.",
    storyFr: "[EXEMPLE] Étude de cas fictive utilisée pour la mise en page.",
    featured: true,
    imageCount: 8,
  },
  {
    slug: "sample-lumen-skincare-catalogue",
    title: "Spring Catalogue",
    titleFr: "Catalogue du printemps",
    clientName: "Lumen Skincare (Sample)",
    category: "product",
    reach: "GLOBAL",
    city: "London",
    country: "United Kingdom",
    year: 2024,
    story: "[SAMPLE] Fictional case study used for layout until real projects are added.",
    storyFr: "[EXEMPLE] Étude de cas fictive utilisée pour la mise en page.",
    featured: true,
    imageCount: 6,
  },
  {
    slug: "sample-harbourfront-cultural-festival",
    title: "Cultural Festival",
    titleFr: "Festival culturel",
    clientName: "Harbourfront Community Arts (Sample)",
    category: "gathering",
    reach: "LOCAL",
    city: "Toronto",
    country: "Canada",
    year: 2024,
    story: "[SAMPLE] Fictional case study used for layout until real projects are added.",
    storyFr: "[EXEMPLE] Étude de cas fictive utilisée pour la mise en page.",
    featured: false,
    imageCount: 5,
  },
];

export type SampleReviewSeed = {
  type: ReviewType;
  authorName: string;
  authorTitle?: string;
  company?: string;
  rating?: number;
  category: string; // service slug
  body: string;
  featured: boolean;
};

export const sampleReviews: SampleReviewSeed[] = [
  {
    type: "CUSTOMER",
    authorName: "Sample Client A.",
    rating: 5,
    category: "wedding",
    body: "[SAMPLE] Placeholder review text for layout only.",
    featured: true,
  },
  {
    type: "CUSTOMER",
    authorName: "Sample Client B.",
    rating: 5,
    category: "family",
    body: "[SAMPLE] Placeholder review text for layout only.",
    featured: true,
  },
  {
    type: "CUSTOMER",
    authorName: "Sample Client C.",
    rating: 4,
    category: "professional",
    body: "[SAMPLE] Placeholder review text for layout only.",
    featured: false,
  },
  {
    type: "RECOMMENDATION",
    authorName: "Sample Person",
    authorTitle: "Events Director (Sample)",
    company: "Northwind Corp (Sample)",
    category: "corporate",
    body: "[SAMPLE] Placeholder recommendation text for layout only.",
    featured: true,
  },
];

/** Launch services (AGENTS.md §1). Starting values only: the owner manages them in Admin → Services. */
export const services = [
  {
    slug: "corporate",
    name: "Corporate Events",
    nameFr: "Événements corporatifs",
    description: "Conferences, launches, galas and on-site headshots.",
    descriptionFr: "Conférences, lancements, galas et portraits sur place.",
    sortOrder: 0,
  },
  {
    slug: "wedding",
    name: "Weddings",
    nameFr: "Mariages",
    description: "Engagement, ceremony and reception.",
    descriptionFr: "Fiançailles, cérémonie et réception.",
    sortOrder: 1,
  },
  {
    slug: "family",
    name: "Family Events",
    nameFr: "Événements familiaux",
    description: "Birthdays, anniversaries, baby showers and milestones.",
    descriptionFr: "Anniversaires, fêtes prénatales et grandes étapes.",
    sortOrder: 2,
  },
  {
    slug: "gathering",
    name: "Gatherings",
    nameFr: "Rassemblements",
    description: "Community, cultural, religious and social events.",
    descriptionFr: "Événements communautaires, culturels, religieux et sociaux.",
    sortOrder: 3,
  },
  {
    slug: "professional",
    name: "Professional Photoshoots",
    nameFr: "Séances professionnelles",
    description: "Portraits, headshots, branding and portfolios.",
    descriptionFr: "Portraits, photos professionnelles, image de marque et portfolios.",
    sortOrder: 4,
  },
  {
    slug: "product",
    name: "Product Photography",
    nameFr: "Photographie de produits",
    description: "E-commerce, catalogue, lifestyle and flat-lay.",
    descriptionFr: "Commerce en ligne, catalogue, mise en situation et vue de dessus.",
    sortOrder: 5,
  },
];
