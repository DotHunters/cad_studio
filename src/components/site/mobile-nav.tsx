"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";

type Item = { href: string; label: string };

type Props = {
  items: Item[];
  ctas: Item[];
  navLabel: string;
  openLabel: string;
  closeLabel: string;
};

export function MobileNav({ items, ctas, navLabel, openLabel, closeLabel }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  // Close when navigating or pressing Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
      </Button>

      {open && (
        <nav
          id={panelId}
          aria-label={navLabel}
          className="bg-background absolute inset-x-0 top-full border-b px-4 pb-6 shadow-sm"
        >
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block py-3 text-base"
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            {ctas.map((cta, index) => (
              <Link
                key={cta.href}
                href={cta.href}
                className={
                  index === 0
                    ? "bg-primary text-primary-foreground rounded-lg px-4 py-3 text-center font-medium"
                    : "rounded-lg border px-4 py-3 text-center font-medium"
                }
              >
                {cta.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
