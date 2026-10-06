import type { Metadata } from "next";
import Link from "next/link";

import { StoredImage } from "@/components/site/stored-image";
import { Button } from "@/components/ui/button";
import { addHeroPhoto } from "@/server/actions/admin/hero-slides";
import { requireAdminPage } from "@/server/auth/guards";
import { getHeroPhotoOptions } from "@/server/queries/hero-slides";

export const metadata: Metadata = { title: "Add a hero photo" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ERRORS: Record<string, string> = {
  choose: "Choose a photo first.",
  photo: "That photo can't be used (it was removed or has no client consent). Choose another.",
};

export default async function AddHeroPhotoPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const [{ error }, options] = await Promise.all([searchParams, getHeroPhotoOptions()]);

  return (
    <>
      <p className="text-sm">
        <Link href="/admin/hero" className="text-gold-text underline-offset-4 hover:underline">
          ← Hero slides
        </Link>
      </p>
      <h1 className="font-heading mt-2 text-4xl">Add a hero photo</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Landscape photos work best: the slideshow fills the whole screen. Only photos with client
        consent are listed.
      </p>

      {typeof error === "string" && ERRORS[error] && (
        <p role="alert" className="text-destructive mt-6 rounded-lg border p-3 text-sm">
          {ERRORS[error]}
        </p>
      )}

      {options.length === 0 ? (
        <p className="text-muted-foreground mt-8">
          No more photos to add. Upload some in Portfolio or Images first.
        </p>
      ) : (
        <form action={addHeroPhoto} className="mt-8 pb-24">
          <fieldset>
            <legend className="mb-3 text-lg font-medium">Photos ({options.length})</legend>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {options.map((image) => (
                <li key={image.id}>
                  <label className="has-[:checked]:ring-gold has-[:focus-visible]:outline-ring relative block cursor-pointer overflow-hidden rounded-lg border has-[:checked]:ring-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2">
                    <input
                      type="radio"
                      name="imageId"
                      value={image.id}
                      required
                      className="accent-gold absolute top-2 left-2 z-10 size-5"
                    />
                    <span className="bg-muted relative block aspect-video">
                      <StoredImage
                        image={image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 50vw"
                        className="object-cover"
                      />
                    </span>
                    <span className="block truncate p-2 text-xs">{image.alt}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="bg-background/95 fixed inset-x-0 bottom-0 z-20 border-t p-4 backdrop-blur lg:left-64">
            <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
              <Link href="/admin/hero" className="text-sm underline-offset-4 hover:underline">
                Cancel
              </Link>
              <Button type="submit">Add to slideshow</Button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
