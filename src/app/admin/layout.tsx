import type { Metadata } from "next";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { cormorant, inter } from "../fonts";
import "../globals.css";

// The admin area is English-only and never indexed (AGENTS.md §10).
export const metadata: Metadata = {
  title: { default: "Admin | Cad Studio", template: "%s | Cad Studio admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-CA" className={cn("font-sans", inter.variable, cormorant.variable)}>
      <body className="bg-background text-foreground min-h-dvh antialiased">{children}</body>
    </html>
  );
}
