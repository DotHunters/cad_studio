"use server";

import { randomBytes } from "node:crypto";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";

import { SESSION_MAX_AGE_SECONDS, signOut } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { passwordSchema } from "@/lib/auth/password-rules";
import { CHANGE_PASSWORD_PATH, safeCallbackUrl, SIGN_IN_PATH } from "@/lib/auth/roles";
import { checkSuperAdmin, isSuperAdminEmail } from "@/lib/auth/super-admin";
import { db } from "@/lib/db";
import { currentAdmin } from "@/server/auth/guards";
import { isRateLimited } from "@/server/rate-limit";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(128),
});

// Compared against when the email is unknown, so a miss takes as long as a wrong password.
const DUMMY_HASH = hashPassword("dummy password for timing");

/** Creates a database session and sets the Auth.js cookie, as Auth.js would after sign-in. */
async function startSession(userId: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await db.session.create({ data: { sessionToken, userId, expires } });
  // Auth.js picks the `__Secure-` cookie over HTTPS, judged from the same forwarded header.
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(
    secure ? "__Secure-authjs.session-token" : "authjs.session-token",
    sessionToken,
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      expires,
    },
  );
}

/** Signs in with email and password: the super admin from .env, or an active team member. */
export async function signInWithPassword(formData: FormData): Promise<void> {
  const callbackUrl = safeCallbackUrl(String(formData.get("callbackUrl") ?? ""));
  const fail = (error: string) =>
    redirect(`${SIGN_IN_PATH}?error=${error}&callbackUrl=${encodeURIComponent(callbackUrl)}`);

  const parsed = credentialsSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) fail("CredentialsSignin");
  const { email, password } = parsed.data!;
  // Per IP and per address, so passwords can't be guessed at speed.
  if ((await isRateLimited("signIn")) || (await isRateLimited("signIn", `email:${email}`))) {
    fail("TooManyRequests");
  }

  let userId: string | null = null;
  let mustChangePassword = false;
  if (checkSuperAdmin(email, password)) {
    // The super admin's account row is created on first sign-in and always restored.
    const upsert = () =>
      db.user.upsert({
        where: { email },
        update: { role: "ADMIN", isActive: true, mustChangePassword: false, passwordHash: null },
        create: { email, name: "Super admin", role: "ADMIN" },
        select: { id: true },
      });
    // Two first sign-ins at once: the loser's insert hits the unique email, then updates.
    userId = (await upsert().catch(upsert)).id;
  } else if (!isSuperAdminEmail(email)) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, isActive: true, passwordHash: true, mustChangePassword: true },
    });
    const valid = await verifyPassword(password, user?.passwordHash ?? (await DUMMY_HASH));
    if (user?.isActive && user.passwordHash && valid) {
      userId = user.id;
      mustChangePassword = user.mustChangePassword;
    }
  }
  // One message for unknown, deactivated and wrong-password, so nobody learns who has access.
  if (!userId) fail("CredentialsSignin");

  await startSession(userId!);
  redirect(
    mustChangePassword
      ? `${CHANGE_PASSWORD_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : callbackUrl,
  );
}

export type ChangePasswordResult = { ok: false; fieldErrors: Record<string, string> };

/** The signed-in user replaces their password (required after an admin set it). */
export async function changeOwnPassword(input: unknown): Promise<ChangePasswordResult> {
  const user = await currentAdmin();
  if (!user || user.isSuperAdmin) {
    return { ok: false, fieldErrors: { form: "You can't change this password here." } };
  }
  const parsed = z
    .object({
      currentPassword: z.string().max(128),
      newPassword: passwordSchema,
      confirmPassword: z.string(),
      callbackUrl: z.string().optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      ),
    };
  }
  const values = parsed.data;
  if (values.newPassword !== values.confirmPassword) {
    return { ok: false, fieldErrors: { confirmPassword: "The passwords don't match." } };
  }
  if (await isRateLimited("signIn", `password:${user.id}`)) {
    return { ok: false, fieldErrors: { form: "Too many attempts. Please wait a few minutes." } };
  }
  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(values.currentPassword, account?.passwordHash ?? null))) {
    return { ok: false, fieldErrors: { currentPassword: "That's not your current password." } };
  }
  if (values.newPassword === values.currentPassword) {
    return { ok: false, fieldErrors: { newPassword: "Choose a different password." } };
  }
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(values.newPassword), mustChangePassword: false },
  });
  redirect(safeCallbackUrl(values.callbackUrl));
}

export async function signOutAdmin(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_PATH });
}
