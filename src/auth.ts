import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";

import { type AdminRole, SIGN_IN_PATH } from "@/lib/auth/roles";
import { isSuperAdminEmail } from "@/lib/auth/super-admin";
import { db } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
      isActive: boolean;
      isSuperAdmin: boolean;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role?: AdminRole;
    isActive?: boolean;
    mustChangePassword?: boolean;
  }
}

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Admin-only auth (AGENTS.md §2, §11) with database sessions. Sign-in is by email and
 * password (`src/server/actions/admin-auth.ts` creates the session row); Auth.js reads and
 * ends sessions. Only existing, active `User` rows and the super admin from .env get in.
 */
export const { handlers, auth, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database", maxAge: SESSION_MAX_AGE_SECONDS, updateAge: 24 * 60 * 60 },
  trustHost: true,
  pages: { signIn: SIGN_IN_PATH, error: SIGN_IN_PATH },
  providers: [],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role ?? "STAFF";
      // Checked by the admin guards, so deactivating someone ends their access at once.
      session.user.isActive = user.isActive ?? false;
      session.user.isSuperAdmin = isSuperAdminEmail(user.email);
      session.user.mustChangePassword = user.mustChangePassword ?? false;
      return session;
    },
  },
});
