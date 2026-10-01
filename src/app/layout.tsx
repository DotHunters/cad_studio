import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { cormorant, inter } from "./fonts";

export const metadata: Metadata = {
  title: "Cad Studio — Photography in Canada",
  description:
    "Cad Studio — event, wedding, portrait and product photography in Toronto and beyond.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, cormorant.variable)}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
