/** Average of 1–5 star ratings, rounded to one decimal; null when there are no ratings. */
export function averageRating(ratings: ReadonlyArray<number | null | undefined>): number | null {
  const valid = ratings.filter(
    (rating): rating is number => typeof rating === "number" && rating >= 1 && rating <= 5,
  );
  if (valid.length === 0) return null;
  const sum = valid.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}
