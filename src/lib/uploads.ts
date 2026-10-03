/** Portfolio photo uploads (Vercel Blob): photos only, up to 25 MB each (camera JPEGs). */
export const UPLOAD_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** One batch at a time keeps the page responsive and the audit log readable. */
export const MAX_UPLOAD_FILES = 30;
