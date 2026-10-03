import { describe, expect, it } from "vitest";

import { adminGuardRedirect, hasRole, safeCallbackUrl } from "@/lib/auth/roles";

describe("hasRole", () => {
  it("lets admins do everything staff can", () => {
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "STAFF")).toBe(true);
    expect(hasRole("STAFF", "STAFF")).toBe(true);
  });

  it("keeps staff out of admin-only actions", () => {
    expect(hasRole("STAFF", "ADMIN")).toBe(false);
  });

  it("denies when there is no role", () => {
    expect(hasRole(undefined, "STAFF")).toBe(false);
    expect(hasRole(null, "STAFF")).toBe(false);
  });
});

describe("adminGuardRedirect", () => {
  it("sends visitors without a session to sign-in, remembering where they were going", () => {
    expect(adminGuardRedirect("/admin/bookings", "?status=PENDING", false)).toBe(
      "/admin/sign-in?callbackUrl=%2Fadmin%2Fbookings%3Fstatus%3DPENDING",
    );
    expect(adminGuardRedirect("/admin", "", false)).toBe("/admin/sign-in?callbackUrl=%2Fadmin");
  });

  it("lets the sign-in pages and signed-in users through", () => {
    expect(adminGuardRedirect("/admin/sign-in", "", false)).toBeNull();
    expect(adminGuardRedirect("/admin/bookings", "", true)).toBeNull();
  });
});

describe("safeCallbackUrl", () => {
  it.each(["/admin", "/admin/bookings", "/admin/reviews?status=PENDING"])("keeps %s", (url) => {
    expect(safeCallbackUrl(url)).toBe(url);
  });

  it.each([
    undefined,
    "",
    "https://evil.example/admin",
    "//evil.example/admin",
    "/admin//evil.example",
    "/admin\\evil",
    "/administrator",
    "/en",
    "/admin/sign-in",
    "/admin/account/password",
  ])("falls back to /admin for %s", (url) => {
    expect(safeCallbackUrl(url)).toBe("/admin");
  });
});
