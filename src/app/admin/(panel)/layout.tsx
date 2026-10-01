import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { signOutAdmin } from "@/server/actions/admin-auth";
import { requireAdminPage } from "@/server/auth/guards";

// Every admin page renders per request with the signed-in user.
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminPage();

  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <Logo alt="Cad Studio" className="h-8" />
            <span className="text-muted-foreground text-xs tracking-[0.2em] uppercase">Admin</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground hidden sm:inline" data-testid="admin-user">
              {user.email} · {user.role === "ADMIN" ? "Admin" : "Staff"}
            </span>
            <form action={signOutAdmin}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
