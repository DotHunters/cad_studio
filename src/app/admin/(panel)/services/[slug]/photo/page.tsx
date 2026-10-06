import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoredImage } from "@/components/site/stored-image";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { setServiceTile } from "@/server/actions/admin/services";
import { requireAdminPage } from "@/server/auth/guards";
import { getServiceTileOptions, type TileImage } from "@/server/queries/service-tiles";

export const metadata: Metadata = { title: "Choose a tile photo" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** One selectable photo: a radio button whose label is the thumbnail. */
function PhotoOption({
  value,
  image,
  label,
  checked,
}: {
  value: string;
  image: TileImage | null;
  label: string;
  checked: boolean;
}) {
  return (
    <li>
      <label className="has-[:checked]:ring-gold has-[:focus-visible]:outline-ring relative block cursor-pointer overflow-hidden rounded-lg border has-[:checked]:ring-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2">
        <input
          type="radio"
          name="imageId"
          value={value}
          defaultChecked={checked}
          className="accent-gold absolute top-2 left-2 z-10 size-5"
        />
        <span className="bg-muted relative block aspect-[4/3]">
          {image ? (
            <StoredImage
              image={image}
              alt=""
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 50vw"
              className="object-cover"
            />
          ) : (
            <span className="text-muted-foreground absolute inset-0 grid place-items-center text-xs">
              Dark background
            </span>
          )}
        </span>
        <span className="block truncate p-2 text-xs">{label}</span>
      </label>
    </li>
  );
}

const gridClass = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5";

export default async function ChooseServiceTilePage({ params, searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const [{ slug }, { error }] = await Promise.all([params, searchParams]);
  const [options, service] = await Promise.all([
    getServiceTileOptions(slug),
    db.service.findUnique({ where: { slug }, select: { name: true } }),
  ]);
  if (!options || !service) notFound();
  const { name } = service;
  const { currentId, defaultImage, sameCategory, others } = options;

  return (
    <>
      <p className="text-sm">
        <Link href="/admin/services" className="text-gold-text underline-offset-4 hover:underline">
          ← All services
        </Link>
      </p>
      <h1 className="font-heading mt-2 text-4xl">{name} tile</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Pick the photo for this tile on the home page. Only photos with client consent are listed;
        upload new ones in Portfolio.
      </p>

      {error === "photo" && (
        <p role="alert" className="text-destructive mt-6 rounded-lg border p-3 text-sm">
          That photo can&apos;t be used (it was removed or has no client consent). Choose another.
        </p>
      )}

      <form action={setServiceTile} className="mt-8 space-y-8 pb-24">
        <input type="hidden" name="slug" value={slug} />
        <fieldset>
          <legend className="mb-3 text-lg font-medium">Default</legend>
          <ul className={gridClass}>
            <PhotoOption
              value=""
              image={defaultImage}
              label="First launch photo"
              checked={!currentId}
            />
          </ul>
        </fieldset>

        {[
          { title: `${name} photos`, images: sameCategory },
          { title: "Other photos", images: others },
        ].map(({ title, images }) =>
          images.length === 0 ? null : (
            <fieldset key={title}>
              <legend className="mb-3 text-lg font-medium">
                {title} ({images.length})
              </legend>
              <ul className={gridClass}>
                {images.map((image) => (
                  <PhotoOption
                    key={image.id}
                    value={image.id}
                    image={image}
                    label={image.alt}
                    checked={image.id === currentId}
                  />
                ))}
              </ul>
            </fieldset>
          ),
        )}

        <div className="bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t p-4 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
            <Link href="/admin/services" className="text-sm underline-offset-4 hover:underline">
              Cancel
            </Link>
            <Button type="submit">Use this photo</Button>
          </div>
        </div>
      </form>
    </>
  );
}
