"use server";

import {
  SITE_SETTING_DEFINITIONS,
  siteSettingDefaults,
  siteSettingErrors,
  siteSettingsFormSchema,
} from "@/lib/admin/site-settings";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

import type { SettingsResult } from "./pricing";

/** Saves the bilingual text settings (AGENTS.md §6.6, §7). ADMIN only. */
export async function saveSiteSettings(input: unknown): Promise<SettingsResult> {
  const actor = await requireRole("ADMIN");
  const fieldErrors = siteSettingErrors(input);
  if (fieldErrors) return { ok: false, fieldErrors };
  const settings = siteSettingsFormSchema.parse(input);
  const before = siteSettingDefaults(
    await db.siteSetting.findMany({ select: { key: true, value: true } }),
  );

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
  // Which texts changed — not their content (payment instructions hold bank details).
  const changed = SITE_SETTING_DEFINITIONS.flatMap(({ key, label }) =>
    (["en", "fr"] as const)
      .filter((language) => before[key]?.[language] !== settings[key]?.[language])
      .map((language) => `${label} (${language.toUpperCase()})`),
  );
  if (changed.length) {
    await audit(actor, {
      action: "settings.update",
      entityType: "SiteSetting",
      summary: `Changed ${changed.join(", ")}`,
    });
  }
  // Package pages show the cancellation policy (booking terms are tagged settings).
  revalidateContent("settings");
  return { ok: true };
}
