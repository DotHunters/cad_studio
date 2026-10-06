import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ServiceForm } from "@/components/admin/service-form";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Edit service" };

type Props = { params: Promise<{ slug: string }> };

export default async function EditServicePage({ params }: Props) {
  await requireAdminPage("ADMIN");
  const { slug } = await params;
  const service = await db.service.findUnique({ where: { slug } });
  if (!service) notFound();

  return (
    <>
      <Link href="/admin/services" className="text-gold-text text-sm underline underline-offset-4">
        ← All services
      </Link>
      <h1 className="font-heading mt-4 text-4xl">Edit {service.name}</h1>
      {service.archivedAt && (
        <p className="text-muted-foreground mt-2 text-sm">Archived — hidden from the site.</p>
      )}
      <div className="mt-8">
        <ServiceForm
          slug={service.slug}
          defaults={{
            slug: service.slug,
            name: service.name,
            nameFr: service.nameFr ?? "",
            description: service.description,
            descriptionFr: service.descriptionFr ?? "",
          }}
        />
      </div>
    </>
  );
}
