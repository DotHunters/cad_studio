"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import { safeCallbackUrl, SIGN_IN_PATH } from "@/lib/auth/roles";

const emailSchema = z.email().max(254);

/** Sends a magic link (only to existing, active admin users — see `src/auth.ts`). */
export async function requestSignInLink(formData: FormData): Promise<void> {
  const email = emailSchema.safeParse(
    String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!email.success) redirect(`${SIGN_IN_PATH}?error=InvalidEmail`);
  await signIn("resend", {
    email: email.data,
    redirectTo: safeCallbackUrl(String(formData.get("callbackUrl") ?? "")),
  });
}

export async function signOutAdmin(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_PATH });
}
