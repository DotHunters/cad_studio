import type { Metadata } from "next";

import { AuthCard } from "@/components/admin/auth-card";
import { Button } from "@/components/ui/button";
import { safeCallbackUrl } from "@/lib/auth/roles";
import { signInWithPassword } from "@/server/actions/admin-auth";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ERRORS: Record<string, string> = {
  CredentialsSignin:
    "That email and password don't match an active account. Ask an admin if you need access.",
  TooManyRequests: "Too many sign-in attempts. Please wait a few minutes and try again.",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-2 block w-full rounded-lg border px-4 py-3 text-base focus-visible:ring-3 focus-visible:outline-none";

export default async function SignInPage({ searchParams }: Props) {
  const query = await searchParams;
  const errorCode = first(query.error);
  const error = errorCode ? (ERRORS[errorCode] ?? "Sign-in failed. Please try again.") : null;
  const describedBy = error ? "sign-in-error" : undefined;

  return (
    <AuthCard title="Sign in" intro="Admin access only. Accounts are created by an admin.">
      <form action={signInWithPassword} className="space-y-5">
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
            autoComplete="username"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={inputClass}
          />
        </div>
        {error && (
          <p id="sign-in-error" role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full">
          Sign in
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          Forgot your password? Ask an admin to set a new one.
        </p>
      </form>
    </AuthCard>
  );
}
