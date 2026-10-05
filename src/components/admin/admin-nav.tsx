"use client";

import {
  BadgeDollarSign,
  BookImage,
  CalendarCheck,
  CalendarOff,
  FileText,
  Images,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  Menu,
  MessageSquareQuote,
  Package,
  PlusSquare,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };
type NavGroup = { label: string | null; items: NavItem[] };

export type AdminNavCounts = { pendingBookings: number; pendingReviews: number };

// Grouped by the job the owner is doing: answering clients, showing work, setting prices,
// running the studio. Catalogue, showcase and studio settings are admin-only.
const GROUPS: NavGroup[] = [
  { label: null, items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Clients",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
      { href: "/admin/quotes", label: "Quotes", icon: FileText },
      { href: "/admin/availability", label: "Availability", icon: CalendarOff },
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote },
    ],
  },
  {
    label: "Showcase",
    items: [
      { href: "/admin/portfolio", label: "Portfolio", icon: BookImage, adminOnly: true },
      { href: "/admin/gallery", label: "Images", icon: Images, adminOnly: true },
      { href: "/admin/service-tiles", label: "Service tiles", icon: LayoutGrid, adminOnly: true },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/packages", label: "Packages", icon: Package, adminOnly: true },
      { href: "/admin/add-ons", label: "Add-ons", icon: PlusSquare, adminOnly: true },
      { href: "/admin/pricing", label: "Pricing", icon: BadgeDollarSign, adminOnly: true },
    ],
  },
  {
    label: "Studio",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
      { href: "/admin/team", label: "Team", icon: Users, adminOnly: true },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText, adminOnly: true },
    ],
  },
];

function isCurrent(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

type Props = {
  isAdmin: boolean;
  counts: AdminNavCounts;
  /** Brand link shown at the top of the sidebar and in the mobile bar. */
  brand: ReactNode;
  /** Signed-in user and account actions, pinned to the bottom of the sidebar. */
  footer: ReactNode;
};

/**
 * Admin sidebar: fixed on large screens, a slide-in drawer below `lg`. One `<nav>` serves
 * both, so there is a single "Admin" landmark. The current section is marked for screen readers.
 */
export function AdminNav({ isAdmin, counts, brand, footer }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer after navigating, and let Esc close it.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const badges: Record<string, number> = {
    "/admin/bookings": counts.pendingBookings,
    "/admin/reviews": counts.pendingReviews,
  };

  const groups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isAdmin || !item.adminOnly),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile bar */}
      <div className="bg-ink text-paper sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-sidebar"
          className="focus-visible:ring-gold -mr-2 rounded-md p-2 outline-none focus-visible:ring-2"
        >
          <Menu className="size-5" aria-hidden />
          <span className="sr-only">Open menu</span>
        </button>
      </div>

      {/* Scrim */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="admin-sidebar"
        className={cn(
          "bg-ink text-paper fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-200 motion-reduce:transition-none dark:border-r dark:border-white/10",
          "lg:translate-x-0",
          open ? "translate-x-0" : "invisible -translate-x-full lg:visible",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-5">
          {brand}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="focus-visible:ring-gold -mr-2 rounded-md p-2 outline-none focus-visible:ring-2 lg:hidden"
          >
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <div className="bg-gold-gradient mx-5 h-px opacity-70" aria-hidden />

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-5">
          {groups.map((group, index) => (
            <div key={group.label ?? index} className={cn(index > 0 && "mt-6")}>
              {group.label && (
                <p className="text-paper/50 mb-2 px-3 text-[0.65rem] font-medium tracking-[0.22em] uppercase">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const current = isCurrent(pathname, item.href);
                  const badge = badges[item.href] ?? 0;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "group focus-visible:ring-gold relative flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-2",
                          current
                            ? "text-gold-light bg-white/[0.06] font-medium"
                            : "text-paper/70 hover:text-paper hover:bg-white/[0.04]",
                        )}
                      >
                        {current && (
                          <span
                            aria-hidden
                            className="bg-gold-gradient absolute inset-y-1.5 -left-3 w-0.5 rounded-full"
                          />
                        )}
                        <Icon
                          className={cn("size-4 shrink-0", current ? "text-gold" : "opacity-70")}
                          aria-hidden
                        />
                        <span className="flex-1">{item.label}</span>
                        {badge > 0 && (
                          <span className="bg-gold text-ink min-w-5 rounded-full px-1.5 text-center text-[0.7rem] leading-5 font-semibold tabular-nums">
                            {badge}
                            <span className="sr-only"> pending</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">{footer}</div>
      </aside>
    </>
  );
}
