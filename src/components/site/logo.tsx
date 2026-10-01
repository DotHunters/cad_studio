import Image from "next/image";

import { cn } from "@/lib/utils";

// Source logos are 2014×814 transparent PNGs (assets/), copied to public/brand/.
const WIDTH = 2014;
const HEIGHT = 814;

type Props = {
  alt: string;
  /** "theme" swaps black/white with the colour scheme; "gold" is for hero/footer. */
  variant?: "theme" | "gold";
  className?: string;
  priority?: boolean;
};

export function Logo({ alt, variant = "theme", className, priority }: Props) {
  const shared = { width: WIDTH, height: HEIGHT, sizes: "160px", priority };

  if (variant === "gold") {
    return (
      <Image src="/brand/logo-gold.png" alt={alt} className={cn("w-auto", className)} {...shared} />
    );
  }

  return (
    <>
      <Image
        src="/brand/logo-black.png"
        alt={alt}
        // Over a dark hero (transparent header) or in dark mode, show the white logo.
        className={cn("w-auto group-data-[transparent=true]:hidden dark:hidden", className)}
        {...shared}
      />
      <Image
        src="/brand/logo-white.png"
        alt=""
        aria-hidden
        className={cn("hidden w-auto group-data-[transparent=true]:block dark:block", className)}
        {...shared}
      />
    </>
  );
}
