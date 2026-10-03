"use client";

import Image, { type ImageProps } from "next/image";

import { cloudinaryLoader } from "@/lib/cloudinary";
import {
  isBlobUrl,
  isLocalId,
  isPlaceholderId,
  localImagePath,
  placeholderBlur,
  storedImageSrc,
  type StoredImage as Stored,
} from "@/lib/images";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

type Props = Omit<ImageProps, "src" | "loader" | "placeholder" | "blurDataURL"> & {
  image: Stored & { blurDataUrl?: string | null };
  /** Required: descriptive text, or "" for purely decorative images. */
  alt: string;
};

/**
 * Renders a DB image. Cloudinary images are resized and served as AVIF/WebP by Cloudinary
 * itself; `local/…` photos (from `pnpm photos`) and photos uploaded in admin (Vercel Blob)
 * by the Next.js image optimizer; seeded
 * `placeholder/…` images render as brand-toned blanks. All get a blur-up placeholder.
 */
export function StoredImage({ image, alt, fill, width, height, ...rest }: Props) {
  const sizing = fill ? { fill } : { width: width ?? image.width, height: height ?? image.height };

  // Local and Vercel Blob photos go through the Next.js image optimizer (AVIF/WebP, sizes).
  if (isLocalId(image.publicId) || isBlobUrl(image.publicId)) {
    return (
      <Image
        src={isBlobUrl(image.publicId) ? image.publicId : localImagePath(image.publicId)}
        alt={alt}
        placeholder={image.blurDataUrl ? "blur" : "empty"}
        blurDataURL={image.blurDataUrl ?? undefined}
        {...sizing}
        {...rest}
      />
    );
  }

  if (isPlaceholderId(image.publicId)) {
    return (
      <Image
        src={storedImageSrc(image)}
        alt={alt}
        placeholder="blur"
        blurDataURL={placeholderBlur(image.publicId)}
        {...sizing}
        {...rest}
      />
    );
  }

  return (
    <Image
      src={image.publicId}
      alt={alt}
      loader={cloudinaryLoader(CLOUD_NAME)}
      placeholder={image.blurDataUrl ? "blur" : "empty"}
      blurDataURL={image.blurDataUrl ?? undefined}
      {...sizing}
      {...rest}
    />
  );
}
