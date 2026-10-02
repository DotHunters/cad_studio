import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  COMPLETED: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  CANCELLED: "bg-muted text-muted-foreground",
  SENT: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  ACCEPTED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  EXPIRED: "bg-muted text-muted-foreground",
  DRAFT: "bg-muted text-muted-foreground",
};

/** Coloured status pill for bookings and quotes. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-muted",
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
