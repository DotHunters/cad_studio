/** Result of a one-click admin row action (switch, delete, reset). */
export type ActionResult = { ok: true } | { ok: false; error: string };
