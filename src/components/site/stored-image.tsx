"use client";

import Image, { type ImageProps } from "next/image";

import { cloudinaryLoader } from "@/lib/cloudinary";
import {
  isPlaceholderId,
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
 * Renders a DB image. Real images go through Cloudinary (resized and served as AVIF/WebP by
 * Cloudinary itself); seeded `placeholder/…` images render as brand-toned blanks. Both get a
 * blur-up placeholder.
 */
export function StoredImage({ image, alt, fill, width, height, ...rest }: Props) {
  const sizing = fill ? { fill } : { width: width ?? image.width, height: height ?? image.height };

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
