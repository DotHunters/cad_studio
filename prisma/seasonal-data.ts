/**
 * Seasonal offers from the owner's flyer "Christmas & Season Photoshoot & Family Photoshoot"
 * (2026-11). Optional one-off: `pnpm db:seed:seasonal` creates what is missing and never
 * overwrites edits. The owner can equally build all of this in Admin → Services, Packages and
 * Add-ons. Hour ranges are stored as their upper end rounded up (see seed-data.ts).
 *
 * TODO(owner-fr): review — all French (`*Fr`) text was drafted by an agent.
 */
import type { AddOnSeed, PackageSeed } from "./seed-data";

const dollars = (amount: number) => Math.round(amount * 100);

export type SeasonalPackageSeed = Omit<PackageSeed, "tiers"> & {
  /** Struck-through price on the offer card; null = no discount shown. */
  regularPriceCents: number | null;
};

export const seasonalService = {
  slug: "seasonal",
  name: "Christmas & Seasonal Photoshoots",
  nameFr: "Séances photo de Noël et de saison",
  description:
    "Couple, family and small-event photoshoots with limited-time seasonal offers. Indoor and outdoor sessions available.",
  descriptionFr:
    "Séances photo en couple, en famille et petits événements à tarifs saisonniers limités. Séances en intérieur et en extérieur offertes.",
  sortOrder: 6,
};

const SESSION_NOTE =
  " Indoor and outdoor photoshoots available; couples, children and full family sessions are welcome.";
const SESSION_NOTE_FR =
  " Séances en intérieur et en extérieur offertes; couples, enfants et familles complètes bienvenus.";

export const seasonalPackages: SeasonalPackageSeed[] = [
  {
    slug: "seasonal-mini-session",
    category: "seasonal",
    name: "Mini Session",
    nameFr: "Mini séance",
    summary: "Per couple shoot, family shoot or small event. 1 to 1.5 hours.",
    summaryFr: "Par séance de couple, de famille ou petit événement. 1 à 1,5 heure.",
    description: `A short, relaxed seasonal session for a couple or a family, or coverage of a small event. 15 colour-graded and edited photos.${SESSION_NOTE}`,
    descriptionFr: `Une courte séance saisonnière détendue pour un couple ou une famille, ou la couverture d'un petit événement. 15 photos étalonnées et retouchées.${SESSION_NOTE_FR}`,
    basePriceCents: dollars(250),
    regularPriceCents: dollars(350),
    includedHours: 2,
    includedShooters: 1,
    editedImages: 15,
    turnaroundDays: null,
    inclusions: [
      "1 to 1.5 hours of coverage",
      "15 colour-graded and edited photos",
      "Indoor or outdoor session",
    ],
    inclusionsFr: [
      "1 à 1,5 heure de couverture",
      "15 photos étalonnées et retouchées",
      "Séance en intérieur ou en extérieur",
    ],
    exclusions: [],
    exclusionsFr: [],
    sortOrder: 1,
  },
  {
    slug: "seasonal-classic-session",
    category: "seasonal",
    name: "Classic Session",
    nameFr: "Séance classique",
    summary: "Per couple shoot, family shoot or small event. 2 to 3 hours.",
    summaryFr: "Par séance de couple, de famille ou petit événement. 2 à 3 heures.",
    description: `More time and more photos for a couple, a family or a small event. 35 colour-graded and edited photos.${SESSION_NOTE}`,
    descriptionFr: `Plus de temps et plus de photos pour un couple, une famille ou un petit événement. 35 photos étalonnées et retouchées.${SESSION_NOTE_FR}`,
    basePriceCents: dollars(400),
    regularPriceCents: dollars(550),
    includedHours: 3,
    includedShooters: 1,
    editedImages: 35,
    turnaroundDays: null,
    inclusions: [
      "2 to 3 hours of coverage",
      "35 colour-graded and edited photos",
      "Indoor or outdoor session",
    ],
    inclusionsFr: [
      "2 à 3 heures de couverture",
      "35 photos étalonnées et retouchées",
      "Séance en intérieur ou en extérieur",
    ],
    exclusions: [],
    exclusionsFr: [],
    sortOrder: 2,
  },
  {
    slug: "seasonal-premium-session",
    category: "seasonal",
    name: "Premium Session",
    nameFr: "Séance prestige",
    summary: "Per couple shoot, family shoot or small event. 4 to 5 hours.",
    summaryFr: "Par séance de couple, de famille ou petit événement. 4 à 5 heures.",
    description: `Our fullest seasonal session, with high-end retouching on your favourite photos. 60+ colour-graded and edited photos, 20 of them high-end retouched.${SESSION_NOTE}`,
    descriptionFr: `Notre séance saisonnière la plus complète, avec retouche haut de gamme sur vos photos préférées. Plus de 60 photos étalonnées et retouchées, dont 20 retouchées haut de gamme.${SESSION_NOTE_FR}`,
    basePriceCents: dollars(650),
    regularPriceCents: dollars(850),
    includedHours: 5,
    includedShooters: 1,
    editedImages: 60,
    turnaroundDays: null,
    inclusions: [
      "4 to 5 hours of coverage",
      "60+ colour-graded and edited photos",
      "20 high-end retouched photos",
      "Indoor or outdoor session",
    ],
    inclusionsFr: [
      "4 à 5 heures de couverture",
      "Plus de 60 photos étalonnées et retouchées",
      "20 photos retouchées haut de gamme",
      "Séance en intérieur ou en extérieur",
    ],
    exclusions: [],
    exclusionsFr: [],
    sortOrder: 3,
  },
  {
    slug: "seasonal-event-coverage",
    category: "seasonal",
    name: "Event Coverage",
    nameFr: "Couverture d'événement",
    summary: "Any Christmas party or event: church events, corporate parties and year-end parties.",
    summaryFr:
      "Toute fête de Noël ou tout événement : événements religieux, fêtes d'entreprise et fêtes de fin d'année.",
    description:
      "Full coverage of your Christmas party or event, from arrival to the last toast. All event photos get basic colour correction and are delivered fast.",
    descriptionFr:
      "Couverture complète de votre fête de Noël ou de votre événement, de l'arrivée au dernier toast. Toutes les photos reçoivent une correction des couleurs de base et sont livrées rapidement.",
    basePriceCents: dollars(750),
    regularPriceCents: null,
    includedHours: 8,
    includedShooters: 1,
    editedImages: null,
    turnaroundDays: null,
    inclusions: [
      "Full coverage, 7 to 8 hours",
      "All event photos with basic colour correction",
      "Fast delivery",
      "Church events, corporate parties and year-end parties",
    ],
    inclusionsFr: [
      "Couverture complète, 7 à 8 heures",
      "Toutes les photos de l'événement avec correction des couleurs de base",
      "Livraison rapide",
      "Événements religieux, fêtes d'entreprise et fêtes de fin d'année",
    ],
    exclusions: [],
    exclusionsFr: [],
    sortOrder: 4,
  },
];

export const seasonalAddOns: AddOnSeed[] = [
  {
    code: "SEASONAL_FRAME",
    name: "10 × 15 inch printed frame",
    nameFr: "Cadre imprimé 10 × 15 po",
    priceCents: dollars(85),
    unit: "PER_ITEM",
    categories: ["seasonal"],
    sortOrder: 1,
  },
  {
    code: "SEASONAL_REELS",
    name: "Professional reels video",
    nameFr: "Vidéo de reels professionnelle",
    priceCents: dollars(350),
    unit: "FLAT",
    categories: ["seasonal"],
    sortOrder: 2,
  },
  {
    code: "SEASONAL_RETOUCH",
    name: "High-end photo retouching (per photo)",
    nameFr: "Retouche photo haut de gamme (par photo)",
    priceCents: dollars(20),
    unit: "PER_ITEM",
    categories: ["seasonal"],
    sortOrder: 3,
  },
];
