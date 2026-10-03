import { Skeleton } from "@/components/ui/skeleton";

/** Loading state for admin lists (AGENTS.md §12). */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" data-testid="list-skeleton">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-6 h-10 w-full max-w-xl" />
      <div className="mt-6 space-y-3 rounded-xl border p-4">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
