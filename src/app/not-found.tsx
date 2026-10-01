import Link from "next/link";

import "./globals.css";

// Requests outside any locale (rare — middleware redirects most) still need a document.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-8 text-center">
        <main>
          <h1 className="text-3xl">Page not found</h1>
          <p className="mt-4">
            <Link className="text-gold-text underline" href="/en">
              Back to home
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
