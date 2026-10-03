import { describe, expect, it } from "vitest";

import {
  passwordProblem,
  superAdminProblem,
  teamChangeProblem,
  teamMemberSchema,
} from "@/lib/admin/team";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";

const members = [
  { id: "owner", role: "ADMIN" as const, isActive: true },
  { id: "photographer", role: "STAFF" as const, isActive: true },
];

describe("teamMemberSchema", () => {
  it("normalizes the email and treats an empty name as none", () => {
    expect(
      teamMemberSchema.parse({
        name: "",
        email: " Alex@Example.COM ",
        role: "STAFF",
        isActive: "on",
      }),
    ).toEqual({ name: null, email: "alex@example.com", role: "STAFF", isActive: true });
  });

  it("explains invalid input", () => {
    const result = teamMemberSchema.safeParse({ email: "nope", role: "" });
    expect(fieldErrorsOf(result.error!)).toEqual({
      email: "Enter a valid email address.",
      role: "Choose a role.",
    });
  });
});

describe("team passwords", () => {
  const base = { email: "alex@example.com", role: "STAFF" };

  it("keeps the password exactly and treats an empty one as unchanged", () => {
    expect(teamMemberSchema.parse({ ...base, password: " a long password " }).password).toBe(
      " a long password ",
    );
    expect(teamMemberSchema.parse({ ...base, password: "" }).password).toBeUndefined();
    expect(teamMemberSchema.parse(base).password).toBeUndefined();
  });

  it("rejects a short password", () => {
    const result = teamMemberSchema.safeParse({ ...base, password: "short" });
    expect(fieldErrorsOf(result.error!)).toEqual({ password: "Use at least 12 characters." });
  });

  it("requires a password only for new members", () => {
    expect(passwordProblem(null, undefined)).toMatch(/temporary password/);
    expect(passwordProblem(null, "a long password")).toBeNull();
    expect(passwordProblem("photographer", undefined)).toBeNull();
  });
});

describe("superAdminProblem", () => {
  const people = [
    { id: "super", email: "owner@example.com" },
    { id: "photographer", email: "photo@example.com" },
  ];

  it("protects the super admin's account and email", () => {
    expect(
      superAdminProblem({ id: "super", email: "owner@example.com" }, people, "owner@example.com"),
    ).toMatch(/managed in the server settings/);
    expect(
      superAdminProblem({ id: null, email: "owner@example.com" }, people, "owner@example.com"),
    ).toBe("This email belongs to the super admin.");
    expect(
      superAdminProblem(
        { id: "photographer", email: "owner@example.com" },
        people,
        "owner@example.com",
      ),
    ).toBe("This email belongs to the super admin.");
  });

  it("allows everything else, and everything when no super admin is set", () => {
    expect(
      superAdminProblem(
        { id: "photographer", email: "new@example.com" },
        people,
        "owner@example.com",
      ),
    ).toBeNull();
    expect(superAdminProblem({ id: "super", email: "owner@example.com" }, people, null)).toBeNull();
  });
});

describe("teamChangeProblem", () => {
  it("allows adding staff and editing others", () => {
    expect(
      teamChangeProblem({ id: null, role: "STAFF", isActive: true }, "owner", members),
    ).toBeNull();
    expect(
      teamChangeProblem({ id: "photographer", role: "ADMIN", isActive: true }, "owner", members),
    ).toBeNull();
    expect(
      teamChangeProblem({ id: "photographer", role: "STAFF", isActive: false }, "owner", members),
    ).toBeNull();
  });

  it("stops people demoting or deactivating themselves", () => {
    expect(
      teamChangeProblem({ id: "owner", role: "STAFF", isActive: true }, "owner", members),
    ).toBe("You can't change your own role.");
    expect(
      teamChangeProblem({ id: "owner", role: "ADMIN", isActive: false }, "owner", members),
    ).toBe("You can't deactivate your own account.");
  });

  it("always keeps an active admin", () => {
    const twoAdmins = [...members, { id: "partner", role: "ADMIN" as const, isActive: true }];
    expect(
      teamChangeProblem({ id: "partner", role: "STAFF", isActive: true }, "owner", twoAdmins),
    ).toBeNull();
    // Even when the change comes from someone other than the last admin.
    const soleAdmin = [
      { id: "owner", role: "ADMIN" as const, isActive: true },
      { id: "me", role: "STAFF" as const, isActive: true },
    ];
    expect(teamChangeProblem({ id: "owner", role: "STAFF", isActive: true }, "me", soleAdmin)).toBe(
      "The studio needs at least one active admin.",
    );
  });

  it("reports missing members", () => {
    expect(
      teamChangeProblem({ id: "ghost", role: "STAFF", isActive: true }, "owner", members),
    ).toBe("This team member no longer exists.");
  });
});
