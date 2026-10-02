"use server";

import { siteSettingErrors, siteSettingsFormSchema } from "@/lib/admin/site-settings";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

import type { SettingsResult } from "./pricing";

/** Saves the bilingual text settings (AGENTS.md §6.6, §7). ADMIN only. */
export async function saveSiteSettings(input: unknown): Promise<SettingsResult> {
  await requireRole("ADMIN");
  const fieldErrors = siteSettingErrors(input);
  if (fieldErrors) return { ok: false, fieldErrors };
  const settings = siteSettingsFormSchema.parse(input);

  try {
    await db.$transaction(
      Object.entries(settings).map(([key, value]) =>
        db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    );
  } catch (error) {
    console.error("[admin] saveSiteSettings failed", error);
    return { ok: false, error: "server" };
  }
  // Package pages show the cancellation policy (booking terms are tagged settings).
  revalidateContent("settings");
  return { ok: true };
}
