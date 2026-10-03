import { describe, expect, it } from "vitest";

import { hashPassword, safeEqual, temporaryPassword, verifyPassword } from "@/lib/auth/password";
import { passwordSchema } from "@/lib/auth/password-rules";
import { checkSuperAdmin, isSuperAdminEmail, superAdminConfig } from "@/lib/auth/super-admin";

describe("hashPassword / verifyPassword", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).toMatch(/^scrypt\$32768\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(stored).not.toContain("correct horse");
    await expect(verifyPassword("correct horse battery", stored)).resolves.toBe(true);
    await expect(verifyPassword("correct horse batterY", stored)).resolves.toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same password!")).not.toBe(await hashPassword("same password!"));
  });

  it("rejects missing and malformed hashes", async () => {
    for (const stored of [
      null,
      "",
      "plain",
      "bcrypt$1$2$3$a$b",
      "scrypt$x$8$1$a$b",
      "scrypt$32768$8$1$c2FsdA$c2hvcnQ",
    ]) {
      await expect(verifyPassword("anything at all", stored)).resolves.toBe(false);
    }
  });
});

describe("passwordSchema", () => {
  it("needs 12 to 128 characters and keeps spaces", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false);
    expect(passwordSchema.parse("  twelve chars ")).toBe("  twelve chars ");
  });
});

describe("safeEqual", () => {
  it("compares strings of any length", () => {
    expect(safeEqual("same", "same")).toBe(true);
    expect(safeEqual("same", "Same")).toBe(false);
    expect(safeEqual("short", "much longer value")).toBe(false);
  });
});

describe("super admin", () => {
  const env = {
    SUPER_ADMIN_EMAIL: " Owner@Example.com ",
    SUPER_ADMIN_PASSWORD: "a long secret pass",
  };

  it("reads the normalized email from the environment", () => {
    expect(superAdminConfig(env)).toEqual({
      email: "owner@example.com",
      password: env.SUPER_ADMIN_PASSWORD,
    });
    expect(isSuperAdminEmail("OWNER@example.com", env)).toBe(true);
    expect(isSuperAdminEmail("someone@example.com", env)).toBe(false);
  });

  it("is off when unset or the password is too short", () => {
    expect(superAdminConfig({})).toBeNull();
    expect(superAdminConfig({ SUPER_ADMIN_EMAIL: "owner@example.com" })).toBeNull();
    expect(superAdminConfig({ ...env, SUPER_ADMIN_PASSWORD: "too short" })).toBeNull();
    expect(isSuperAdminEmail("owner@example.com", {})).toBe(false);
  });

  it("checks the email and the exact password", () => {
    expect(checkSuperAdmin("owner@example.com", "a long secret pass", env)).toBe(true);
    expect(checkSuperAdmin("owner@example.com", "a long secret pass ", env)).toBe(false);
    expect(checkSuperAdmin("other@example.com", "a long secret pass", env)).toBe(false);
    expect(checkSuperAdmin("owner@example.com", "a long secret pass", {})).toBe(false);
  });
});

describe("temporaryPassword", () => {
  it("is long enough, readable and different every time", () => {
    const password = temporaryPassword();
    expect(password).toMatch(/^[a-hjkmnp-zA-HJ-NP-Z2-9]{4}(-[a-hjkmnp-zA-HJ-NP-Z2-9]{4}){3}$/);
    expect(password.length).toBeGreaterThanOrEqual(12);
    expect(new Set(Array.from({ length: 50 }, temporaryPassword)).size).toBe(50);
  });
});
