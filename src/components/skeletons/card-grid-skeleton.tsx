import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for card lists (packages, portfolio, gallery, reviews — AGENTS.md §12).
 * Announced once to screen readers via the status label; the blocks themselves are hidden.
 */
export function CardGridSkeleton({ label, cards = 6 }: { label: string; cards?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24"
      data-testid="list-skeleton"
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="mx-auto h-4 w-32" />
      <Skeleton className="mx-auto mt-6 h-12 w-3/4 max-w-xl" />
      <Skeleton className="mx-auto mt-4 h-5 w-2/3 max-w-lg" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index}>
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="mt-4 h-6 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
