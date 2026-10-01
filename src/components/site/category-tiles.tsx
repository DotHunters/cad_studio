import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { categorySlugs } from "@/lib/categories";
import { placeholderImage } from "@/lib/images";

export function CategoryTiles() {
  const t = useTranslations();

  return (
    <section aria-labelledby="categories-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <h2 id="categories-title" className="text-3xl sm:text-4xl">
          {t("Home.categoriesTitle")}
        </h2>
        <p className="text-muted-foreground mt-2">{t("Home.categoriesIntro")}</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categorySlugs.map((slug) => {
          const name = t(`Categories.${slug}.name`);
          return (
            <li key={slug}>
              <Link
                href={{ pathname: "/packages", query: { category: slug } }}
                className="group focus-visible:ring-ring relative block aspect-[4/3] overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none"
              >
                {/* TODO(owner): replace with a real image per category. */}
                <Image
                  src={placeholderImage(800, 600)}
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
