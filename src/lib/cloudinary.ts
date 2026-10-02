/**
 * Cloudinary delivery (AGENTS.md §2, §6.4, §10). Images are transformed by Cloudinary:
 * `f_auto` serves AVIF/WebP, `q_auto` picks quality, `c_limit,w_` resizes without upscaling.
 * Watermarks are applied at upload time (admin, task 7.4), never in the browser.
 */
type UrlOptions = { cloudName: string; width?: number; quality?: number };

export function cloudinaryUrl(publicId: string, { cloudName, width, quality }: UrlOptions): string {
  if (!cloudName) {
    throw new Error(
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set; cannot render Cloudinary images",
    );
  }
  const transforms = ["f_auto", `q_${quality ?? "auto"}`];
  if (width) transforms.push("c_limit", `w_${width}`);
  const path = publicId.split("/").map(encodeURIComponent).join("/");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(",")}/${path}`;
}

/** A next/image loader bound to a cloud name. */
export function cloudinaryLoader(cloudName: string) {
  return ({ src, width, quality }: { src: string; width: number; quality?: number }) =>
    cloudinaryUrl(src, { cloudName, width, quality });
}

/** Solid-colour blur placeholder for images without a stored blurDataUrl. */
export function solidBlurDataUrl(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#${hex}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
