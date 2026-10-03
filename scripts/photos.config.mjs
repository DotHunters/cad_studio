/**
 * Source photos for `pnpm photos` (scripts/optimize-photos.mjs). Originals live in `assets/`
 * (git-ignored); the optimized WebP files go to `public/photos/<slug>/<slug>-NN.webp` and their
 * metadata to `src/data/photos.json`, which the site and the seed read.
 *
 * Files in each folder are numbered in natural sort order, so `01.jpg, 03.jpg, 12.jpg` become
 * `<slug>-01.webp, <slug>-02.webp, <slug>-03.webp`. Add a folder here and re-run to publish more.
 *
 * TODO(owner): confirm reach (Local/Global), city and country for each project; the seed only
 * creates projects, so later edits in Admin → Portfolio are kept.
 * TODO(owner-fr): review — French titles and alt text were drafted by an agent.
 */

/** @typedef {"CORPORATE"|"WEDDING"|"FAMILY"|"GATHERING"|"PROFESSIONAL"|"PRODUCT"} Category */

/**
 * @type {Array<{ slug: string; source: string; category: Category; tags: string[];
 *   title: string; titleFr: string; alt: string; altFr: string; featured?: boolean }>}
 */
export const groups = [
  {
    slug: "christian-wedding",
    source: "Christian Wedding",
    category: "WEDDING",
    tags: ["christian-wedding", "ceremony"],
    title: "Christian Church Wedding",
    titleFr: "Mariage à l’église",
    alt: "Christian church wedding: bride, groom, family and bridal party",
    altFr: "Mariage à l’église : mariés, famille et cortège",
    featured: true,
  },
  {
    slug: "sinhala-wedding",
    source: "sinhala weddign",
    category: "WEDDING",
    tags: ["sinhala-wedding", "ceremony"],
    title: "Sinhala Wedding",
    titleFr: "Mariage cinghalais",
    alt: "Sinhala wedding: bride and groom in traditional Kandyan attire",
    altFr: "Mariage cinghalais : mariés en tenue traditionnelle kandyenne",
    featured: true,
  },
  {
    slug: "hindu-wedding",
    source: "sri and heily Hindu wedding",
    category: "WEDDING",
    tags: ["hindu-wedding", "ceremony"],
    title: "Hindu Wedding",
    titleFr: "Mariage hindou",
    alt: "Hindu wedding: bride in a coral silk saree and groom in a white veshti",
    altFr: "Mariage hindou : mariée en sari de soie corail et marié en veshti blanc",
    featured: true,
  },
  {
    slug: "bride-and-groom-preshoot",
    source: "Groom and Bride preshoot",
    category: "WEDDING",
    tags: ["pre-shoot"],
    title: "Bride and Groom Pre-shoot",
    titleFr: "Séance avant le mariage",
    alt: "Bride and groom pre-wedding portrait session",
    altFr: "Séance de portraits des mariés avant le mariage",
    featured: true,
  },
  {
    slug: "wedding-preshoot",
    source: "Wedding preshoot",
    category: "WEDDING",
    tags: ["pre-shoot"],
    title: "Temple Pre-wedding Shoot",
    titleFr: "Séance prénuptiale au temple",
    alt: "Pre-wedding shoot: couple in traditional dress among temple architecture",
    altFr: "Séance prénuptiale : couple en tenue traditionnelle devant un temple",
  },
  {
    slug: "outdoor-theme-preshoot",
    source: "Out Door theme Shoot for wedding",
    category: "WEDDING",
    tags: ["pre-shoot", "outdoor"],
    title: "Outdoor Themed Pre-shoot",
    titleFr: "Séance thématique en extérieur",
    alt: "Outdoor vintage-themed pre-wedding shoot with a classic motorcycle",
    altFr: "Séance prénuptiale en extérieur au thème rétro, avec une moto ancienne",
  },
  {
    slug: "wedding-day",
    source: "Wedding Day preshoot",
    category: "WEDDING",
    tags: ["wedding-day"],
    title: "Wedding Day Portraits",
    titleFr: "Portraits du jour du mariage",
    alt: "Wedding day portraits of the bride and groom with a vintage car",
    altFr: "Portraits des mariés le jour du mariage avec une voiture ancienne",
  },
  {
    slug: "baby-shower",
    source: "Baby Shower",
    category: "FAMILY",
    tags: ["baby-shower"],
    title: "Garden Baby Shower",
    titleFr: "Fête prénatale au jardin",
    alt: "Baby shower: parents-to-be and guests with pastel balloons",
    altFr: "Fête prénatale : futurs parents et invités avec des ballons pastel",
    featured: true,
  },
  {
    slug: "maternity-session",
    source: "Baby Shower 2",
    category: "FAMILY",
    tags: ["maternity", "baby-shower"],
    title: "Maternity Session",
    titleFr: "Séance de maternité",
    alt: "Studio maternity session of an expecting couple",
    altFr: "Séance de maternité en studio d’un couple qui attend un enfant",
  },
  {
    slug: "puberty-ceremony",
    source: "Pubetry Ceremony",
    category: "FAMILY",
    tags: ["puberty-ceremony", "ceremony"],
    title: "Puberty Ceremony",
    titleFr: "Cérémonie de puberté",
    alt: "Puberty ceremony: young woman in a mint saree with her family",
    altFr: "Cérémonie de puberté : jeune femme en sari menthe avec sa famille",
  },
  {
    slug: "model-shoot",
    source: "model shoot",
    category: "PROFESSIONAL",
    tags: ["model-portfolio"],
    title: "Model Portfolio Shoot",
    titleFr: "Séance portfolio de mannequin",
    alt: "Model portfolio shoot in a hotel suite",
    altFr: "Séance portfolio de mannequin dans une suite d’hôtel",
    featured: true,
  },
];

/**
 * Home hero slides, in order: a group's original file name and the CSS object-position that
 * keeps the subject in frame when the image is cropped to the viewport.
 */
export const hero = [
  { group: "bride-and-groom-preshoot", file: "04.jpg", position: "50% 50%" },
  { group: "maternity-session", file: "16.jpg", position: "50% 30%" },
  { group: "model-shoot", file: "00 (9).jpg", position: "50% 30%" },
  { group: "sinhala-wedding", file: "10.jpg", position: "50% 35%" },
  { group: "christian-wedding", file: "69.jpg", position: "50% 40%" },
  { group: "outdoor-theme-preshoot", file: "13.jpg", position: "50% 60%" },
];

/** One-off images: owner portraits and dark section backgrounds. */
export const singles = {
  owner: ["Owner.jpg", "Owner2.JPG"],
  background: ["Slide1.jpg", "slide2.jpg", "slide3.jpg", "slide4.jpg"],
};

/** Longest edge of the optimized files; next/image derives smaller sizes from these. */
export const MAX_EDGE = 2400;
export const WEBP_QUALITY = 80;
