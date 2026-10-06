import type { Metadata } from "next";
import Link from "next/link";

import { ActionSwitch, ConfirmDeleteButton } from "@/components/admin/row-actions";
import { StoredImage } from "@/components/site/stored-image";
import { buttonVariants } from "@/components/ui/button";
import { type ServiceUsage, usageTotal } from "@/lib/services";
import { deleteService, moveService, setServiceActive } from "@/server/actions/admin/services";
import { requireAdminPage } from "@/server/auth/guards";
import { defaultTileImage } from "@/server/queries/service-tiles";
import { listServicesForAdmin } from "@/server/queries/services";

import { MoveButtons } from "./move-buttons";

export const metadata: Metadata = { title: "Services" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const USAGE_LABELS: Record<keyof ServiceUsage, string> = {
  packages: "packages",
  addOns: "add-ons",
  quotes: "quotes",
  bookings: "bookings",
  projects: "portfolio projects",
  images: "photos",
  reviews: "reviews",
};

const usageTitle = (usage: ServiceUsage) =>
  (Object.keys(USAGE_LABELS) as Array<keyof ServiceUsage>)
    .map((key) => `${usage[key]} ${USAGE_LABELS[key]}`)
    .join(", ");

export default async function AdminServicesPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const { saved } = await searchParams;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">Services</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            What the studio offers. Archived services are hidden from the site and from new quotes
            and bookings; past work keeps its service.
          </p>
        </div>
        <Link href="/admin/services/new" className={buttonVariants()}>
          New service
        </Link>
      </div>

      {typeof saved === "string" && (
        <p
          role="status"
          className="mt-6 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          Saved. The site shows it now.
        </p>
      )}
      {/* No skeleton: a Suspense boundary here (or a loading.tsx) stops the row actions from
          refreshing this page — see .claude/loop.md. */}
      <ServicesTable />
    </>
  );
}

async function ServicesTable() {
  const services = await listServicesForAdmin();
  if (services.length === 0) {
    return <p className="text-muted-foreground mt-8">No services yet.</p>;
  }
  return (
    <div className="mt-8 overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wider uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Order
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Service
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              In use
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {services.map((service, index) => {
            const image = service.tileImage ?? defaultTileImage(service.slug);
            return (
              <tr key={service.slug}>
                <td className="px-4 py-3">
                  <MoveButtons
                    name={service.name}
                    moveUp={moveService.bind(null, service.slug, "up")}
                    moveDown={moveService.bind(null, service.slug, "down")}
                    isFirst={index === 0}
                    isLast={index === services.length - 1}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-muted relative block h-12 w-16 shrink-0 overflow-hidden rounded">
                      {image && (
                        <StoredImage
                          image={image}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span>
                      <Link
                        href={`/admin/services/${service.slug}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {service.name}
                      </Link>
                      <span className="text-muted-foreground block font-mono text-xs">
                        {service.slug}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ActionSwitch
                    checked={service.archivedAt === null}
                    label={`Active: ${service.name}`}
                    onText="Active"
                    offText="Archived"
                    action={setServiceActive.bind(null, service.slug)}
                  />
                </td>
                <td className="px-4 py-3 tabular-nums" title={usageTitle(service.usage)}>
                  {usageTotal(service.usage)}
                  <span className="sr-only">: {usageTitle(service.usage)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <Link
                      href={`/admin/services/${service.slug}`}
                      aria-label={`Edit ${service.name}`}
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/services/${service.slug}/photo`}
                      aria-label={`Change photo: ${service.name}`}
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                    >
                      Change photo
                    </Link>
                    <ConfirmDeleteButton
                      itemName={service.name}
                      action={deleteService.bind(null, service.slug)}
                      disabled={usageTotal(service.usage) > 0}
                      disabledReason="In use — archive instead."
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
