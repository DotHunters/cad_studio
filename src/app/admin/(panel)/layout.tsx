import { KeyRound, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/site/logo";
import { hasRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { signOutAdmin } from "@/server/actions/admin-auth";
import { requireAdminPage } from "@/server/auth/guards";

// Every admin page renders per request with the signed-in user.
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminPage();
  const [pendingBookings, pendingReviews] = await Promise.all([
    db.booking.count({ where: { status: "PENDING" } }),
    db.review.count({ where: { status: "PENDING" } }),
  ]);
  const roleLabel = user.isSuperAdmin ? "Super admin" : user.role === "ADMIN" ? "Admin" : "Staff";

  const brand = (
    <Link
      href="/admin"
      className="focus-visible:ring-gold flex items-center gap-3 rounded-sm outline-none focus-visible:ring-2"
    >
      <Logo alt="CAD Studio Photography" variant="gold" className="h-8" />
      <span className="text-paper/60 text-[0.65rem] tracking-[0.25em] uppercase">Admin</span>
    </Link>
  );

  const footer = (
    <div className="space-y-3 text-sm">
      <div data-testid="admin-user">
        <p className="truncate" title={user.email ?? undefined}>
          <span className="sr-only">Signed in as </span>
          {user.email}
          <span className="sr-only"> · </span>
        </p>
        <p className="text-gold mt-0.5 text-[0.65rem] tracking-[0.22em] uppercase">{roleLabel}</p>
      </div>
      <div className="flex items-center gap-1">
        <Link
          href="/admin/account/password"
          className="text-paper/70 hover:text-paper focus-visible:ring-gold flex items-center gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-white/[0.04] focus-visible:ring-2"
        >
          <KeyRound className="size-4" aria-hidden />
          Password
        </Link>
        <form action={signOutAdmin} className="ml-auto">
          <button
            type="submit"
            className="text-paper/70 hover:text-paper focus-visible:ring-gold flex items-center gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-white/[0.04] focus-visible:ring-2"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <AdminNav
        isAdmin={hasRole(user.role, "ADMIN")}
        counts={{ pendingBookings, pendingReviews }}
        brand={brand}
        footer={footer}
      />
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
        {children}
      </main>
    </div>
  );
}
