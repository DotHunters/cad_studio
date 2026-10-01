import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
