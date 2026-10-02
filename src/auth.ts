import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";

import { siteConfig } from "@/config/site";
import { type AdminRole, SIGN_IN_PATH } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: AdminRole; isActive: boolean } & DefaultSession["user"];
  }
  interface User {
    role?: AdminRole;
    isActive?: boolean;
  }
}

const CHECK_EMAIL_PATH = `${SIGN_IN_PATH}/check-email`;

/**
 * Admin-only auth (AGENTS.md §2, §11): email magic link, database sessions. Only existing,
 * active `User` rows can sign in — there's no sign-up; the owner adds staff in admin.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database", maxAge: 7 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  trustHost: true,
  pages: { signIn: SIGN_IN_PATH, verifyRequest: CHECK_EMAIL_PATH, error: SIGN_IN_PATH },
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? `${siteConfig.name} <${siteConfig.contact.bookingsEmail}>`,
      maxAge: 15 * 60,
      async sendVerificationRequest({ identifier, url }) {
        const result = await sendEmail({
          to: identifier,
          subject: `Sign in to ${siteConfig.name} admin`,
          text: [
            `Use this link to sign in to the ${siteConfig.name} admin. It expires in 15 minutes and works once.`,
            "",
            url,
            "",
            "If you didn't ask for this, you can ignore this email.",
          ].join("\n"),
        });
        // Without an email key (development/test only — sendEmail throws in production),
        // print the link so a developer can still sign in.
        if (!result.sent) console.warn(`[auth] Sign-in link for ${identifier}: ${url}`);
      },
    }),
  ],
  callbacks: {
    async signIn({ user, email }) {
      const address = (user.email ?? "").trim().toLowerCase();
      const account = address
        ? await db.user.findUnique({ where: { email: address }, select: { isActive: true } })
        : null;
      if (account?.isActive) return true;
      // Unknown or deactivated: no email is sent, but the page looks the same so the form
      // can't be used to discover which addresses have access.
      return email?.verificationRequest ? CHECK_EMAIL_PATH : `${SIGN_IN_PATH}?error=AccessDenied`;
    },
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role ?? "STAFF";
      // Checked by the admin guards, so deactivating someone ends their access at once.
      session.user.isActive = user.isActive ?? false;
      return session;
    },
  },
});
