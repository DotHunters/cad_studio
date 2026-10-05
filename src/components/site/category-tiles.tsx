import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { categorySlugs } from "@/lib/categories";
import { placeholderImage } from "@/lib/images";
import { getServiceTileImages } from "@/server/queries/service-tiles";

import { Accent, SectionHeading } from "./section-heading";
import { StoredImage } from "./stored-image";

const TILE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";
const TILE_CLASS =
  "object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100";

/** Service tiles; each photo is chosen in Admin → Service tiles (default: first launch photo). */
export async function CategoryTiles() {
  const [t, images] = await Promise.all([getTranslations(), getServiceTileImages()]);

  return (
    <section
      aria-labelledby="categories-title"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28"
    >
      <SectionHeading
        id="categories-title"
        align="center"
        eyebrow={t("Home.categoriesEyebrow")}
        title={t.rich("Home.categoriesTitle", { accent: (chunks) => <Accent>{chunks}</Accent> })}
        intro={t("Home.categoriesIntro")}
        className="mb-12"
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categorySlugs.map((slug) => {
          const name = t(`Categories.${slug}.name`);
          const image = images[slug];
          return (
            <li key={slug}>
              <Link
                href={{ pathname: "/packages", query: { category: slug } }}
                className="group focus-visible:ring-ring relative block aspect-[4/3] overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none"
              >
                {image ? (
                  <StoredImage
                    image={image}
                    alt=""
                    fill
                    sizes={TILE_SIZES}
                    className={TILE_CLASS}
                  />
                ) : (
                  // TODO(owner): choose photos for the empty tiles in Admin → Service tiles.
                  <Image
                    src={placeholderImage(800, 600)}
                    alt=""
                    fill
                    sizes={TILE_SIZES}
                    className={TILE_CLASS}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="text-paper absolute inset-x-0 bottom-0 p-5">
                  <h3 className="text-2xl">{name}</h3>
                  <p className="text-paper/85 mt-1 text-sm">
                    {t(`Categories.${slug}.description`)}
                  </p>
                  <span className="text-gold-light mt-3 inline-block text-sm font-medium underline-offset-4 group-hover:underline">
                    {t("Home.viewPackages")}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
