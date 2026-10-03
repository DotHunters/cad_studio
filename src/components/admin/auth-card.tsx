import type { ReactNode } from "react";

import { Logo } from "@/components/site/logo";

/** Centred card for the admin sign-in screens. */
export function AuthCard({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-paper dark:bg-ink flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="bg-card w-full max-w-md rounded-xl border p-8 shadow-sm">
        <Logo alt="CAD Studio Photography" className="mx-auto h-12" priority />
        <div className="bg-gold-gradient mx-auto mt-6 h-px w-16" aria-hidden />
        <h1 className="font-heading mt-6 text-center text-3xl">{title}</h1>
        <p className="text-muted-foreground mt-2 text-center text-sm">{intro}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
