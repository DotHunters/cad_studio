import type { Metadata } from "next";

import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { siteSettingDefaults } from "@/lib/admin/site-settings";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdminPage("ADMIN");
  const records = await db.siteSetting.findMany({ select: { key: true, value: true } });

  return (
    <>
      <h1 className="font-heading text-4xl">Settings</h1>
      <p className="text-muted-foreground mt-1 mb-8 text-sm">
        Text clients receive. The deposit percentage is on the Pricing page.
      </p>
      <SiteSettingsForm values={siteSettingDefaults(records)} />
    </>
  );
}
