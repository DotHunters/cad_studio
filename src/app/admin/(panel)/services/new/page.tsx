import type { Metadata } from "next";
import Link from "next/link";

import { ServiceForm } from "@/components/admin/service-form";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "New service" };

export default async function NewServicePage() {
  await requireAdminPage("ADMIN");
  return (
    <>
      <Link href="/admin/services" className="text-gold-text text-sm underline underline-offset-4">
        ← All services
      </Link>
      <h1 className="font-heading mt-4 mb-8 text-4xl">New service</h1>
      <ServiceForm
        slug={null}
        defaults={{ slug: "", name: "", nameFr: "", description: "", descriptionFr: "" }}
      />
    </>
  );
}
