import type { Metadata } from "next";

import { AuthCard } from "@/components/admin/auth-card";
import { Button } from "@/components/ui/button";
import { safeCallbackUrl } from "@/lib/auth/roles";
import { requestSignInLink } from "@/server/actions/admin-auth";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ERRORS: Record<string, string> = {
  InvalidEmail: "Enter a valid email address.",
  AccessDenied: "This account can't sign in. Ask the studio owner for access.",
  Verification: "That sign-in link has expired or was already used. Request a new one.",
  TooManyRequests: "Too many sign-in requests. Please wait a few minutes and try again.",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function SignInPage({ searchParams }: Props) {
  const query = await searchParams;
  const errorCode = first(query.error);
  const error = errorCode ? (ERRORS[errorCode] ?? "Sign-in failed. Please try again.") : null;

  return (
    <AuthCard
      title="Sign in"
      intro="Enter your studio email and we'll send you a sign-in link. Admin access only."
    >
      <form action={requestSignInLink} className="space-y-5">
        <input type="hidden" name="callbackUrl" value={safeCallbackUrl(first(query.callbackUrl))} />
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "sign-in-error" : undefined}
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-2 block w-full rounded-lg border px-4 py-3 text-base focus-visible:ring-3 focus-visible:outline-none"
          />
        </div>
        {error && (
          <p id="sign-in-error" role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full">
          Email me a sign-in link
        </Button>
      </form>
    </AuthCard>
  );
}
