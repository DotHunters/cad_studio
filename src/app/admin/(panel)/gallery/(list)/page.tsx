import type { Metadata } from "next";
import Link from "next/link";

import { StoredImage } from "@/components/site/stored-image";
import { requireAdminPage } from "@/server/auth/guards";
import { listImagesForAdmin } from "@/server/queries/admin-images";

export const metadata: Metadata = { title: "Images" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminGalleryPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const [{ saved }, images] = await Promise.all([searchParams, listImagesForAdmin()]);
  const missingConsent = images.filter((image) => !image.consentToPublish).length;

  return (
    <>
      <h1 className="font-heading text-4xl">Images</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Gallery and case-study photos. Only images with client consent are shown on the website.
        Uploading arrives once the Cloudinary account is connected.
      </p>

      {typeof saved === "string" && (
        <p
          role="status"
          className="mt-6 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          Image saved.
        </p>
      )}
      {missingConsent > 0 && (
        <p className="mt-4 text-sm text-amber-800 dark:text-amber-300">
          {missingConsent} {missingConsent === 1 ? "image is" : "images are"} hidden until consent
          is confirmed.
        </p>
      )}

      {images.length === 0 ? (
        <p className="text-muted-foreground mt-8">No images yet.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="bg-card overflow-hidden rounded-xl border">
              <div className="bg-muted relative aspect-[4/3]">
                <StoredImage
                  image={image}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="space-y-1 p-3 text-sm">
                <Link
                  href={`/admin/gallery/${image.id}`}
                  className="line-clamp-2 font-medium underline-offset-4 hover:underline"
                >
                  {image.alt}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {image.project ? image.project.title : "No project"}
                  {image.project?.coverId === image.id && " · Cover"} · Order {image.sortOrder}
                </p>
                <p className="flex flex-wrap gap-1.5 text-xs">
                  {image.isSample && <span className="bg-muted rounded px-1.5 py-0.5">Sample</span>}
                  {image.inGallery && (
                    <span className="bg-muted rounded px-1.5 py-0.5">Gallery</span>
                  )}
                  {image.consentToPublish ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                      Consent
                    </span>
                  ) : (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      No consent
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
