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
  /** Options (e.g. Essential / Signature / Premium), in display order. Keys never change. */
  tiers?: TierSeed[];
};

export type TierSeed = {
  key: string;
  name: string;
  nameFr: string;
  basePriceCents: number;
  includedHours: number;
  includedShooters: number;
  editedImages: number | null;
  inclusions: string[];
  inclusionsFr: string[];
};

// Wedding, engagement, maternity and birthday options: owner's price list ("WEDDING
// PHOTOGRAPHY", 2026-10-20). Hour ranges are stored as their upper end (e.g. "5 to 7 hours"
// → 7) so the quote engine charges extra hours only beyond what the owner offers; ranges stay
// in the inclusions. Half hours round up because hours are whole numbers.

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
    summary: "Ceremony, portraits and celebration — the whole story.",
    summaryFr: "Cérémonie, portraits et célébration — toute l'histoire.",
    description:
      "We capture your day with a calm, organized approach shaped by years of event management. Choose the coverage that fits your celebration, from the key moments to the full day.",
    descriptionFr:
      "Nous capturons votre journée avec une approche calme et organisée façonnée par des années de gestion d'événements. Choisissez la couverture qui convient à votre célébration, des moments clés à la journée complète.",
    basePriceCents: dollars(2000),
    includedHours: 7,
    includedShooters: 1,
    editedImages: 150,
    turnaroundDays: 42,
    inclusions: [
      "Ceremony coverage",
      "Couple portraits",
      "Family & group portraits",
      "Professionally edited high-resolution images",
      "Printed album",
      "Digital delivery",
    ],
    inclusionsFr: [
      "Couverture de la cérémonie",
      "Portraits du couple",
      "Portraits de famille et de groupe",
      "Images haute résolution retouchées professionnellement",
      "Album imprimé",
      "Livraison numérique",
    ],
    exclusions: ["Travel beyond 40 km"],
    exclusionsFr: ["Déplacements au-delà de 40 km"],
    sortOrder: 2,
    tiers: [
      {
        key: "essential",
        name: "Essential",
        nameFr: "Essentiel",
        basePriceCents: dollars(2000),
        includedHours: 7,
        includedShooters: 1,
        editedImages: 150,
        inclusions: [
          "5 to 7 hours of coverage",
          "1 professional photographer",
          "Ceremony & key moments",
          "Couple portraits",
          "Family & group portraits",
          "150 professionally edited high-resolution images",
          "10 × 20 album, 35 sheets",
          "Digital delivery",
        ],
        inclusionsFr: [
          "5 à 7 heures de couverture",
          "1 photographe professionnel",
          "Cérémonie et moments clés",
          "Portraits du couple",
          "Portraits de famille et de groupe",
          "150 images haute résolution retouchées professionnellement",
          "Album 10 × 20, 35 feuillets",
          "Livraison numérique",
        ],
      },
      {
        key: "signature",
        name: "Signature",
        nameFr: "Signature",
        basePriceCents: dollars(2800),
        includedHours: 10,
        includedShooters: 2,
        editedImages: 400,
        inclusions: [
          "8 to 10 hours of coverage",
          "2 professional photographers",
          "Getting-ready coverage",
          "Ceremony events",
          "Couple portraits",
          "Family & group portraits",
          "Candid photography",
          "400+ edited images",
          "12 × 24 album, 35 sheets",
          "Two 12 × 18 photo frames",
          "Digital delivery",
        ],
        inclusionsFr: [
          "8 à 10 heures de couverture",
          "2 photographes professionnels",
          "Couverture des préparatifs",
          "Événements de la cérémonie",
          "Portraits du couple",
          "Portraits de famille et de groupe",
          "Photographie spontanée",
          "400+ images retouchées",
          "Album 12 × 24, 35 feuillets",
          "Deux cadres photo 12 × 18",
          "Livraison numérique",
        ],
      },
      {
        key: "premium",
        name: "Premium",
        nameFr: "Premium",
        basePriceCents: dollars(3550),
        includedHours: 12,
        includedShooters: 2,
        editedImages: 600,
        inclusions: [
          "Full-day coverage",
          "2 photographers",
          "Getting ready through reception",
          "Full ceremony & traditions",
          "Creative couple portraits",
          "Family & guest portraits",
          "600+ edited images",
          "Pre- or post-wedding couple session",
          "Sneak-peek images",
          "Online gallery",
          "12 × 25 album, 25 sheets",
          "8 × 20 album, 20 sheets",
          "Two 12 × 18 photo frames",
          "16 × 24 photo frame",
          "24 × 36 photo frame",
        ],
        inclusionsFr: [
          "Couverture d'une journée complète",
          "2 photographes",
          "Des préparatifs à la réception",
          "Cérémonie complète et traditions",
          "Portraits créatifs du couple",
          "Portraits de famille et des invités",
          "600+ images retouchées",
          "Séance de couple avant ou après le mariage",
          "Aperçu des premières images",
          "Galerie en ligne",
          "Album 12 × 25, 25 feuillets",
          "Album 8 × 20, 20 feuillets",
          "Deux cadres photo 12 × 18",
          "Cadre photo 16 × 24",
          "Cadre photo 24 × 36",
        ],
      },
    ],
  },
  {
    slug: "engagement-couples",
    category: "wedding",
    name: "Engagement & Couples",
    nameFr: "Fiançailles et couples",
    summary: "Engagement and couple sessions, from one look to a full creative shoot.",
    summaryFr: "Séances de fiançailles et de couple, d'une tenue à une séance créative complète.",
    description:
      "A relaxed session for the two of you — to celebrate an engagement, a save-the-date or simply this chapter together.",
    descriptionFr:
      "Une séance détendue pour vous deux — pour célébrer des fiançailles, une annonce de mariage ou simplement ce chapitre de votre vie.",
    basePriceCents: dollars(350),
    includedHours: 1,
    includedShooters: 1,
    editedImages: 30,
    turnaroundDays: null,
    inclusions: ["Couple portraits", "Professionally edited images"],
    inclusionsFr: ["Portraits du couple", "Images retouchées professionnellement"],
    exclusions: ["Travel beyond 40 km"],
    exclusionsFr: ["Déplacements au-delà de 40 km"],
    sortOrder: 3,
    tiers: [
      {
        key: "mini",
        name: "Mini",
        nameFr: "Mini",
        basePriceCents: dollars(350),
        includedHours: 1,
        includedShooters: 1,
        editedImages: 30,
        inclusions: ["1 location", "1 outfit/look", "30+ edited images"],
        inclusionsFr: ["1 lieu", "1 tenue", "30+ images retouchées"],
      },
      {
        key: "signature",
        name: "Signature",
        nameFr: "Signature",
        basePriceCents: dollars(500),
        includedHours: 2,
        includedShooters: 1,
        editedImages: 50,
        inclusions: ["1.5 to 2 hours", "1–2 locations", "2 outfits/looks", "50+ edited images"],
        inclusionsFr: ["1,5 à 2 heures", "1 ou 2 lieux", "2 tenues", "50+ images retouchées"],
      },
      {
        key: "premium",
        name: "Premium",
        nameFr: "Premium",
        basePriceCents: dollars(850),
        includedHours: 5,
        includedShooters: 1,
        editedImages: 100,
        inclusions: [
          "3 to 5 hours",
          "Multiple locations",
          "Multiple outfits",
          "Creative direction",
          "100+ edited images",
        ],
        inclusionsFr: [
          "3 à 5 heures",
          "Plusieurs lieux",
          "Plusieurs tenues",
          "Direction créative",
          "100+ images retouchées",
        ],
      },
    ],
  },
  {
    // Slug kept from the earlier "Family Event" package: saved quotes and bookings refer to it.
    slug: "family-event",
    category: "family",
    name: "Birthdays & Private Events",
    nameFr: "Anniversaires et événements privés",
    summary: "Birthdays, anniversaries and private celebrations.",
    summaryFr: "Anniversaires de naissance, de mariage et célébrations privées.",
    description:
      "Relaxed coverage of the moments that matter to your family, with guidance for group photos so nobody is missed.",
    descriptionFr:
      "Une couverture détendue des moments qui comptent pour votre famille, avec un accompagnement pour les photos de groupe afin que personne ne soit oublié.",
    basePriceCents: dollars(500),
    includedHours: 2,
    includedShooters: 1,
    editedImages: null,
    turnaroundDays: 14,
    inclusions: [
      "Candid moments",
      "Family & group portraits",
      "Decor & detail photos",
      "Professionally edited images",
    ],
    inclusionsFr: [
      "Moments spontanés",
      "Portraits de famille et de groupe",
      "Photos du décor et des détails",
      "Images retouchées professionnellement",
    ],
    exclusions: ["Travel beyond 40 km"],
    exclusionsFr: ["Déplacements au-delà de 40 km"],
    sortOrder: 4,
    tiers: [
      {
        key: "essential",
        name: "Essential",
        nameFr: "Essentiel",
        basePriceCents: dollars(500),
        includedHours: 2,
        includedShooters: 1,
        editedImages: null,
        inclusions: [
          "Event photography",
          "Candid moments",
          "Family & group portraits",
          "Decor & detail photos",
          "Professionally edited images",
          "Online gallery",
        ],
        inclusionsFr: [
          "Photographie de l'événement",
          "Moments spontanés",
          "Portraits de famille et de groupe",
          "Photos du décor et des détails",
          "Images retouchées professionnellement",
          "Galerie en ligne",
        ],
      },
      {
        key: "signature",
        name: "Signature",
        nameFr: "Signature",
        basePriceCents: dollars(850),
        includedHours: 5,
        includedShooters: 1,
        editedImages: null,
        inclusions: [
          "Full event storytelling",
          "Guest photography",
          "Family & group portraits",
          "Candid moments",
          "Decor & details",
          "Professionally edited images",
          "Online gallery",
        ],
        inclusionsFr: [
          "Récit complet de l'événement",
          "Photos des invités",
          "Portraits de famille et de groupe",
          "Moments spontanés",
          "Décor et détails",
          "Images retouchées professionnellement",
          "Galerie en ligne",
        ],
      },
      {
        key: "premium",
        name: "Premium",
        nameFr: "Premium",
        basePriceCents: dollars(1300),
        includedHours: 8,
        includedShooters: 1,
        editedImages: null,
        inclusions: [
          "6 to 8 hours of extended coverage",
          "Portraits & candid moments",
          "Family & guest photos",
          "Decor & celebration details",
          "Professionally edited high-resolution images",
          "10 × 25 album, 25 sheets",
        ],
        inclusionsFr: [
          "6 à 8 heures de couverture prolongée",
          "Portraits et moments spontanés",
          "Photos de famille et des invités",
          "Décor et détails de la célébration",
          "Images haute résolution retouchées professionnellement",
          "Album 10 × 25, 25 feuillets",
        ],
      },
    ],
  },
  {
    slug: "maternity",
    category: "family",
    name: "Maternity",
    nameFr: "Maternité",
    summary: "Maternity portraits, on your own or with your partner and family.",
    summaryFr: "Portraits de maternité, seule ou avec votre partenaire et votre famille.",
    description:
      "A calm, unhurried session to remember this time — with outfit changes, locations and family included as your package allows.",
    descriptionFr:
      "Une séance calme et sans précipitation pour garder le souvenir de ce moment — avec changements de tenue, lieux et famille selon votre forfait.",
    basePriceCents: dollars(350),
    includedHours: 2,
    includedShooters: 1,
    editedImages: 30,
    turnaroundDays: null,
    inclusions: ["Maternity portraits", "Professionally edited images"],
    inclusionsFr: ["Portraits de maternité", "Images retouchées professionnellement"],
    exclusions: ["Travel beyond 40 km"],
    exclusionsFr: ["Déplacements au-delà de 40 km"],
    sortOrder: 5,
    tiers: [
      {
        key: "mini",
        name: "Mini",
        nameFr: "Mini",
        basePriceCents: dollars(350),
        includedHours: 2,
        includedShooters: 1,
        editedImages: 30,
        inclusions: ["1 to 1.5 hour session", "1 location", "1 outfit", "30 edited images"],
        inclusionsFr: ["Séance de 1 à 1,5 heure", "1 lieu", "1 tenue", "30 images retouchées"],
      },
      {
        key: "signature",
        name: "Signature",
        nameFr: "Signature",
        basePriceCents: dollars(500),
        includedHours: 3,
        includedShooters: 1,
        editedImages: 50,
        inclusions: [
          "2.5 hour session",
          "Up to 2 outfits",
          "Maternity portraits",
          "Couple portraits",
          "50 edited images",
        ],
        inclusionsFr: [
          "Séance de 2,5 heures",
          "Jusqu'à 2 tenues",
          "Portraits de maternité",
          "Portraits du couple",
          "50 images retouchées",
        ],
      },
      {
        key: "premium",
        name: "Premium",
        nameFr: "Premium",
        basePriceCents: dollars(750),
        includedHours: 5,
        includedShooters: 1,
        editedImages: 80,
        inclusions: [
          "3 to 5 hours",
          "Multiple outfits",
          "Multiple locations",
          "Couple & family portraits",
          "Premium retouching",
          "80+ edited images",
        ],
        inclusionsFr: [
          "3 à 5 heures",
          "Plusieurs tenues",
          "Plusieurs lieux",
          "Portraits du couple et de la famille",
          "Retouches haut de gamme",
          "80+ images retouchées",
        ],
      },
    ],
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
    sortOrder: 6,
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
    sortOrder: 7,
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
    sortOrder: 8,
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
    // Weddings have their own videography add-on (WEDDING_VIDEO).
    categories: ["corporate", "family", "gathering"],
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
    // Wedding options include albums; extra ones are CUSTOM_ALBUM.
    categories: ["family", "gathering"],
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
  // Wedding add-ons from the owner's price list (2026-10-20).
  {
    code: "WEDDING_VIDEO",
    name: "Videography with 3–5 min highlight video",
    nameFr: "Vidéographie avec vidéo souvenir de 3 à 5 min",
    priceCents: dollars(550),
    unit: "FLAT",
    categories: ["wedding"],
    sortOrder: 8,
  },
  {
    code: "CUSTOM_ALBUM",
    name: "Custom album",
    nameFr: "Album personnalisé",
    priceCents: dollars(500),
    unit: "FLAT",
    categories: ["wedding"],
    sortOrder: 9,
  },
  {
    code: "EXTRA_COVERAGE",
    name: "Additional coverage (per hour)",
    nameFr: "Couverture supplémentaire (par heure)",
    priceCents: dollars(250),
    unit: "PER_ITEM",
    categories: ["wedding"],
    sortOrder: 10,
  },
  {
    // Owner's price is $350–$500 depending on the shoot; the final price is confirmed per quote.
    code: "EXTRA_SHOOT",
    name: "Additional photo shoot",
    nameFr: "Séance photo supplémentaire",
    priceCents: dollars(350),
    unit: "FLAT",
    categories: ["wedding"],
    sortOrder: 11,
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
