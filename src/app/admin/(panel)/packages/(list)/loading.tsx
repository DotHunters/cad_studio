import { TableSkeleton } from "@/components/skeletons/table-skeleton";

/** Shown while this admin list loads (AGENTS.md §12). Scoped to the list, so detail pages
 * keep returning real 404s. */
export default function Loading() {
  return <TableSkeleton />;
}
