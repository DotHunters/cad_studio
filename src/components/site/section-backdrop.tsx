import Image from "next/image";

import type { Photo } from "@/lib/photos";
import { cn } from "@/lib/utils";

type Props = {
  photo: Photo | undefined;
  /** Overlay strength; text on top needs ≥ 4.5:1 contrast, so keep it dark. */
  overlayClassName?: string;
};

/**
 * Decorative photo behind a dark section (the owner's camera still lifes). Rendered with
 * empty alt, under an ink overlay so text contrast stays AA. Parent must be `relative`.
 */
export function SectionBackdrop({ photo, overlayClassName }: Props) {
  if (!photo) return null;
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <Image
        src={photo.src}
        alt=""
        fill
        sizes="100vw"
        placeholder="blur"
        blurDataURL={photo.blurDataUrl}
        className="object-cover"
      />
      <div className={cn("bg-ink/85 absolute inset-0", overlayClassName)} />
    </div>
  );
}
