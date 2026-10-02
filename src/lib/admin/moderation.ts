/**
 * Review moderation (AGENTS.md §6.7, §8.4). Pure: decides what an admin action changes, so
 * the rules are unit tested. Nothing is ever published without an explicit approval.
 */
export const MODERATION_INTENTS = [
  "approve",
  "reject",
  "pending",
  "feature",
  "unfeature",
  "allow-logo",
  "revoke-logo",
] as const;

export type ModerationIntent = (typeof MODERATION_INTENTS)[number];

type ReviewState = { status: string; type: string; featured: boolean };

export type ModerationUpdate = {
  status?: "APPROVED" | "REJECTED" | "PENDING";
  featured?: boolean;
  logoPermission?: boolean;
};

export function moderationUpdate(
  intent: ModerationIntent,
  review: ReviewState,
): { ok: true; data: ModerationUpdate } | { ok: false; reason: string } {
  switch (intent) {
    case "approve":
      return { ok: true, data: { status: "APPROVED" } };
    case "reject":
      // Featured reviews must be approved, so rejecting also un-features.
      return { ok: true, data: { status: "REJECTED", featured: false } };
    case "pending":
      return { ok: true, data: { status: "PENDING", featured: false } };
    case "feature":
      return review.status === "APPROVED"
        ? { ok: true, data: { featured: true } }
        : { ok: false, reason: "Approve the review before featuring it." };
    case "unfeature":
      return { ok: true, data: { featured: false } };
    case "allow-logo":
      // Company logos need written permission (§8.4) and only exist on recommendations.
      return review.type === "RECOMMENDATION"
        ? { ok: true, data: { logoPermission: true } }
        : { ok: false, reason: "Only recommendations can show a company logo." };
    case "revoke-logo":
      return { ok: true, data: { logoPermission: false } };
  }
}
