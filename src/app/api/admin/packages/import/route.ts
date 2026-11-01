import { hasRole } from "@/lib/auth/roles";
import { adminCredentialsSchema } from "@/lib/validators/admin/credentials";
import { packageImportSchema } from "@/lib/validators/admin/package-import";
import { audit } from "@/server/audit";
import { verifyAdminCredentials } from "@/server/auth/credentials";
import { revalidateContent } from "@/server/cache";
import { importPackages, PackageImportError } from "@/server/package-import";
import { isRateLimited } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** `Authorization: Basic base64(email:password)` → credentials, or null. */
function basicCredentials(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  if (colon < 0) return null;
  const parsed = adminCredentialsSchema.safeParse({
    email: decoded.slice(0, colon),
    password: decoded.slice(colon + 1),
  });
  return parsed.success ? parsed.data : null;
}

/**
 * Replaces the package list from a script (scripts/push-packages.ts) — see
 * `importPackages`. ADMIN only, by email and password on each request (no session), with
 * the sign-in rate limits. API routes aren't covered by the /admin middleware.
 */
export async function POST(request: Request): Promise<Response> {
  const credentials = basicCredentials(request);
  if (!credentials) return Response.json({ error: "Sign-in required." }, { status: 401 });
  if (
    (await isRateLimited("signIn")) ||
    (await isRateLimited("signIn", `email:${credentials.email}`))
  ) {
    return Response.json({ error: "Too many attempts. Wait a few minutes." }, { status: 429 });
  }
  const user = await verifyAdminCredentials(credentials.email, credentials.password);
  if (!user) return Response.json({ error: "Wrong email or password." }, { status: 401 });
  if (user.mustChangePassword || !hasRole(user.role, "ADMIN")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = packageImportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid package data.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const summary = await importPackages(parsed.data);
    if (!summary.dryRun) {
      await audit(user, {
        action: "package.import",
        entityType: "Package",
        summary: `Imported ${parsed.data.packages.length} packages, deleted ${summary.deleted.length}`,
        details: summary,
      });
      revalidateContent("packages");
    }
    return Response.json(summary);
  } catch (error) {
    if (error instanceof PackageImportError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[package-import] failed", error);
    return Response.json({ error: "Import failed; nothing was changed." }, { status: 500 });
  }
}
