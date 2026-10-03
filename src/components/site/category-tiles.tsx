import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { categorySlugs } from "@/lib/categories";
import { placeholderImage } from "@/lib/images";
import { categoryPhoto } from "@/lib/photos";

import { Accent, SectionHeading } from "./section-heading";

export function CategoryTiles() {
  const t = useTranslations();

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
          const photo = categoryPhoto(slug);
          return (
            <li key={slug}>
              <Link
                href={{ pathname: "/packages", query: { category: slug } }}
                className="group focus-visible:ring-ring relative block aspect-[4/3] overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none"
              >
                {/* TODO(owner): photos for categories without work yet (corporate, gathering, product). */}
                <Image
                  src={photo ? photo.src : placeholderImage(800, 600)}
                  {...(photo && { placeholder: "blur" as const, blurDataURL: photo.blurDataUrl })}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
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
