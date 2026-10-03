import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { hasRole } from "@/lib/auth/roles";
import { MAX_UPLOAD_BYTES, UPLOAD_CONTENT_TYPES } from "@/lib/uploads";
import { currentAdmin } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

/**
 * Issues short-lived tokens so the browser uploads portfolio photos straight to Vercel Blob
 * (no server size limit). ADMIN only — API routes aren't covered by the /admin middleware,
 * so the role is checked here. No completion callback: the admin page itself converts each
 * photo (`processProjectPhoto`) and records them (`addProjectImages`) after the upload.
 */
export async function POST(request: Request): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Photo storage isn't set up." }, { status: 503 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await currentAdmin();
        if (!user || user.mustChangePassword || !hasRole(user.role, "ADMIN")) {
          throw new Error("Forbidden");
        }
        // Originals land here and are replaced by an optimized WebP (processProjectPhoto).
        if (!pathname.startsWith("portfolio/_incoming/")) throw new Error("Unexpected upload path");
        return {
          allowedContentTypes: UPLOAD_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    const forbidden = error instanceof Error && error.message === "Forbidden";
    return Response.json(
      { error: forbidden ? "Forbidden" : "Upload couldn't start." },
      { status: forbidden ? 403 : 400 },
    );
  }
}
