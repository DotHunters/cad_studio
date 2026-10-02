import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { slugFromCategory } from "@/lib/categories";
import { formatInStudioTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { moderateReview } from "@/server/actions/admin/reviews";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions } from "@/server/queries/admin-packages";

export const metadata: Metadata = { title: "Reviews" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
] as const;
type Status = (typeof STATUSES)[number]["value"];

// Only known messages are shown (the query string is user-controlled).
const ERRORS: Record<string, string> = {
  invalid: "That action wasn't recognized.",
  missing: "That review no longer exists.",
  "Approve the review before featuring it.": "Approve the review before featuring it.",
  "Only recommendations can show a company logo.": "Only recommendations can show a company logo.",
};
const DONE: Record<string, string> = {
  approve: "Approved — it's now on the website.",
  reject: "Rejected — it won't be shown.",
  pending: "Moved back to pending.",
  feature: "Featured on the home page.",
  unfeature: "No longer featured.",
  "allow-logo": "Logo permission recorded.",
  "revoke-logo": "Logo permission removed.",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function AdminReviewsPage({ searchParams }: Props) {
  await requireAdminPage();
  const query = await searchParams;
  const requested = first(query.status);
  const status: Status = STATUSES.some((s) => s.value === requested)
    ? (requested as Status)
    : "PENDING";
  const error = ERRORS[first(query.error) ?? ""];
  const done = DONE[first(query.done) ?? ""];

  const [reviews, counts, categories] = await Promise.all([
    db.review.findMany({
      where: { status },
      orderBy: [{ flagged: "desc" }, { createdAt: "desc" }],
      include: { booking: { select: { reference: true } } },
    }),
    db.review.groupBy({ by: ["status"], _count: true }),
    adminCategoryOptions(),
  ]);
  const countOf = (value: Status) => counts.find((row) => row.status === value)?._count ?? 0;
  const categoryLabel = new Map(categories.map((option) => [option.value, option.label]));

  const action = (id: string, intent: string, label: string, variant?: "outline") => (
    <form action={moderateReview}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="returnTo" value={status} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );

  return (
    <>
      <h1 className="font-heading text-4xl">Reviews</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Nothing is published until it&apos;s approved here.
      </p>

      <nav aria-label="Review status" className="mt-6 flex flex-wrap gap-2">
        {STATUSES.map((option) => (
          <Link
            key={option.value}
            href={`/admin/reviews?status=${option.value}`}
            aria-current={option.value === status ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              option.value === status ? "bg-ink text-paper dark:bg-paper dark:text-ink" : "",
            )}
          >
            {option.label} ({countOf(option.value)})
          </Link>
        ))}
      </nav>

      {done && (
        <p
          role="status"
          className="mt-6 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          {done}
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive mt-6 text-sm">
          {error}
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="text-muted-foreground mt-8">No {status.toLowerCase()} reviews.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {reviews.map((review) => (
            <li key={review.id}>
              <article
                aria-label={`Review by ${review.authorName}`}
                className={cn(
                  "bg-card rounded-xl border p-5",
                  review.flagged && "border-amber-400 dark:border-amber-700",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{review.authorName}</span>
                  {review.type === "RECOMMENDATION" && (
                    <span className="text-muted-foreground">
                      {[review.authorTitle, review.company].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {review.rating !== null && (
                    <span aria-label={`${review.rating} out of 5 stars`}>
                      {"★".repeat(review.rating)}
                      <span className="text-muted-foreground">{"★".repeat(5 - review.rating)}</span>
                    </span>
                  )}
                  {review.flagged && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      Flagged as possible spam
                    </span>
                  )}
                  {review.verified && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                      Verified client{review.booking ? ` · ${review.booking.reference}` : ""}
                    </span>
                  )}
                  {review.isSample && (
                    <span className="bg-muted rounded px-1.5 py-0.5 text-xs">Sample</span>
                  )}
                  {review.featured && (
                    <span className="bg-muted rounded px-1.5 py-0.5 text-xs">Featured</span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {review.type === "RECOMMENDATION" ? "Recommendation" : "Customer review"}
                  {review.category &&
                    ` · ${categoryLabel.get(slugFromCategory(review.category))}`}{" "}
                  · {review.locale.toUpperCase()} ·{" "}
                  {formatInStudioTz(review.createdAt, "MMM d, yyyy h:mm a")}
                </p>
                <p className="mt-3 text-sm whitespace-pre-line">{review.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.status !== "APPROVED" && action(review.id, "approve", "Approve")}
                  {review.status !== "REJECTED" && action(review.id, "reject", "Reject", "outline")}
                  {review.status !== "PENDING" &&
                    action(review.id, "pending", "Back to pending", "outline")}
                  {review.status === "APPROVED" &&
                    (review.featured
                      ? action(review.id, "unfeature", "Unfeature", "outline")
                      : action(review.id, "feature", "Feature", "outline"))}
                  {review.type === "RECOMMENDATION" &&
                    (review.logoPermission
                      ? action(review.id, "revoke-logo", "Remove logo permission", "outline")
                      : action(review.id, "allow-logo", "Logo permission received", "outline"))}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
