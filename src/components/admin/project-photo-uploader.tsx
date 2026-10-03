"use client";

import { upload } from "@vercel/blob/client";
import { Loader2, Upload } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";

import { adminFieldClass } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_FILES, UPLOAD_CONTENT_TYPES } from "@/lib/uploads";
import { addProjectImages, processProjectPhoto } from "@/server/actions/admin/projects";

type Status = {
  name: string;
  state: "waiting" | "uploading" | "optimizing" | "done" | "failed";
  percent: number;
  detail?: string;
};

const megabytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

const fileSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "") || "photo";

/**
 * Bulk photo upload for a portfolio project (AGENTS.md §6.10, §9). Files go straight from the
 * browser to Vercel Blob; the project then records them with numbered alt text.
 */
export function ProjectPhotoUploader({
  projectId,
  projectSlug,
  defaultAlt,
  enabled,
}: {
  projectId: string;
  projectSlug: string;
  defaultAlt: string;
  enabled: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [message, setMessage] = useState<{ kind: "status" | "alert"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!enabled) {
    return (
      <p className="text-muted-foreground rounded-lg border p-4 text-sm">
        Photo upload isn&apos;t set up yet. Connect a Vercel Blob store to the project (it adds
        BLOB_READ_WRITE_TOKEN), then redeploy.
      </p>
    );
  }

  const setStatus = (index: number, patch: Partial<Status>) =>
    setStatuses((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const consent = form.get("consent") === "on";
    const altPrefix = String(form.get("altPrefix") ?? "");
    setMessage(null);
    if (files.length === 0)
      return setMessage({ kind: "alert", text: "Choose at least one photo." });
    if (!consent) {
      return setMessage({
        kind: "alert",
        text: "Confirm that the client agreed to publish these photos.",
      });
    }
    setStatuses(files.map((file) => ({ name: file.name, state: "waiting", percent: 0 })));

    startTransition(async () => {
      const uploaded = [];
      for (const [index, file] of files.entries()) {
        setStatus(index, { state: "uploading" });
        try {
          // The original goes up as-is; the server turns it into a web-ready WebP.
          const original = await upload(
            `portfolio/_incoming/${projectSlug}/${fileSlug(file.name)}`,
            file,
            {
              access: "public",
              handleUploadUrl: "/api/admin/uploads",
              multipart: file.size > 8 * 1024 * 1024,
              onUploadProgress: ({ percentage }) => setStatus(index, { percent: percentage }),
            },
          );
          setStatus(index, { state: "optimizing" });
          const processed = await processProjectPhoto(projectSlug, original.url);
          if (!processed.ok) {
            setStatus(index, { state: "failed", detail: processed.error });
            continue;
          }
          uploaded.push(processed.photo);
          setStatus(index, {
            state: "done",
            percent: 100,
            detail: `${megabytes(processed.bytes.before)} → ${megabytes(processed.bytes.after)} WebP`,
          });
        } catch {
          setStatus(index, { state: "failed" });
        }
      }
      const failed = files.length - uploaded.length;
      if (uploaded.length === 0) {
        setMessage({ kind: "alert", text: "No photos were uploaded. Please try again." });
        return;
      }
      const result = await addProjectImages(projectId, { consent, altPrefix, images: uploaded });
      if (!result.ok) return setMessage({ kind: "alert", text: result.error });
      setFiles([]);
      setMessage({
        kind: failed ? "alert" : "status",
        text:
          `Added ${result.added} photo${result.added === 1 ? "" : "s"}. ` +
          (failed ? `${failed} couldn't be uploaded — try those again. ` : "") +
          "Refine each photo's description in Images.",
      });
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-lg border p-5">
      <div>
        <label htmlFor="upload-files" className="text-sm font-medium">
          Photos
        </label>
        <input
          id="upload-files"
          type="file"
          multiple
          accept={UPLOAD_CONTENT_TYPES.join(",")}
          className={adminFieldClass}
          onChange={(event) => {
            const chosen = Array.from(event.target.files ?? []);
            const tooBig = chosen.filter((file) => file.size > MAX_UPLOAD_BYTES);
            setFiles(
              chosen.filter((file) => file.size <= MAX_UPLOAD_BYTES).slice(0, MAX_UPLOAD_FILES),
            );
            setStatuses([]);
            setMessage(
              tooBig.length || chosen.length > MAX_UPLOAD_FILES
                ? {
                    kind: "alert",
                    text: `Up to ${MAX_UPLOAD_FILES} photos of 25 MB each at a time${tooBig.length ? `; skipped ${tooBig.map((file) => file.name).join(", ")}` : ""}.`,
                  }
                : null,
            );
          }}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          JPEG, PNG, WebP or AVIF, up to 25 MB each. Full-size originals are fine: each one is
          turned upright, resized to at most 2400 px, converted to WebP and stripped of camera data
          (including GPS location).
        </p>
      </div>
      <div>
        <label htmlFor="upload-alt" className="text-sm font-medium">
          Description for these photos
        </label>
        <input
          id="upload-alt"
          name="altPrefix"
          defaultValue={defaultAlt}
          className={adminFieldClass}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Read aloud by screen readers. Photos are numbered (“… — photo 3”); refine each one in
          Images.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" className="accent-gold mt-0.5 size-4" />
        Client consent to publish obtained
      </label>
      {statuses.length > 0 && (
        <ul className="space-y-1 text-xs" aria-label="Upload progress">
          {statuses.map((item) => (
            <li key={item.name} className="flex justify-between gap-4">
              <span className="truncate">{item.name}</span>
              <span
                className={item.state === "failed" ? "text-destructive" : "text-muted-foreground"}
              >
                {item.state === "uploading"
                  ? `${Math.round(item.percent)}%`
                  : item.state === "optimizing"
                    ? "converting to WebP…"
                    : (item.detail ?? item.state)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p
          role={message.kind}
          className={message.kind === "alert" ? "text-destructive text-sm" : "text-sm"}
        >
          {message.text}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
        {pending
          ? "Uploading…"
          : `Upload ${files.length || ""} photo${files.length === 1 ? "" : "s"}`}
      </Button>
    </form>
  );
}
