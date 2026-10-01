import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { adminGuardRedirect, SESSION_COOKIES } from "./lib/auth/roles";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Cheap redirect only; every admin page and action verifies the session itself.
    const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
    const target = adminGuardRedirect(pathname, search, hasSession);
    return target ? NextResponse.redirect(new URL(target, request.url)) : NextResponse.next();
  }
  return intl(request);
}

export const config = {
  // 1) Localize public pages only. Skip API routes, the (English-only) admin area,
  //    Next internals, and files with an extension (favicon, images, robots.txt…).
  //    Note the double backslash: the regex needs a literal "\." to mean "contains a dot".
  // 2) Guard the admin area.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)", "/admin", "/admin/:path*"],
};
