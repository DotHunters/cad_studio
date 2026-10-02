"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import { safeCallbackUrl, SIGN_IN_PATH } from "@/lib/auth/roles";
import { isRateLimited } from "@/server/rate-limit";

const emailSchema = z.email().max(254);

/** Sends a magic link (only to existing, active admin users — see `src/auth.ts`). */
export async function requestSignInLink(formData: FormData): Promise<void> {
  const email = emailSchema.safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!email.success) redirect(`${SIGN_IN_PATH}?error=InvalidEmail`);
  // Per IP and per address, so nobody can flood an inbox with sign-in links.
  if ((await isRateLimited("signIn")) || (await isRateLimited("signIn", `email:${email.data}`))) {
    redirect(`${SIGN_IN_PATH}?error=TooManyRequests`);
  }
  await signIn("resend", {
    email: email.data,
    redirectTo: safeCallbackUrl(String(formData.get("callbackUrl") ?? "")),
  });
}

export async function signOutAdmin(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_PATH });
}
