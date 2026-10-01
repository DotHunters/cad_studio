import type { Metadata } from "next";

import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Dashboard" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminDashboardPage({ searchParams }: Props) {
  const user = await requireAdminPage();
  const { error } = await searchParams;

  return (
    <>
      <h1 className="font-heading text-4xl">Dashboard</h1>
      <p className="text-muted-foreground mt-2">Welcome back{user.name ? `, ${user.name}` : ""}.</p>
      {error === "forbidden" && (
        <p role="alert" className="text-destructive mt-6 text-sm">
          You don&apos;t have permission to open that page.
        </p>
      )}
      {/* Upcoming bookings, new quotes, pending reviews and revenue arrive with task 7.2. */}
    </>
  );
}
