import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Localize public pages only. Skip API routes, the (English-only) admin area,
  // Next internals, and files with an extension (favicon, images, robots.txt…).
  // Note the double backslash: the regex needs a literal "\." to mean "contains a dot".
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
