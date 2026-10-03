import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** shadcn/ui skeleton block; the pulse stops for reduced-motion users (globals.css). */
function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
