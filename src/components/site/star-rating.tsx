import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = { rating: number; label: string; className?: string };

/** Five stars with an accessible text label (the icons are decorative). */
export function StarRating({ rating, label, className }: Props) {
  return (
    <span role="img" aria-label={label} className={cn("inline-flex gap-0.5", className)}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden
          className={cn(
            "size-4",
            index < Math.round(rating) ? "fill-gold text-gold" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}
