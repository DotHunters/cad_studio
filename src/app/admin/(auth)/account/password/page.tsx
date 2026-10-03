import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { safeCallbackUrl, SIGN_IN_PATH } from "@/lib/auth/roles";
import { currentAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Change password" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ChangePasswordPage({ searchParams }: Props) {
  const user = await currentAdmin();
  if (!user) redirect(SIGN_IN_PATH);
  const { callbackUrl } = await searchParams;
  const back = safeCallbackUrl(typeof callbackUrl === "string" ? callbackUrl : null);

  if (user.isSuperAdmin) {
    return (
      <AuthCard
        title="Change password"
        intro="The super admin password is set on the server (SUPER_ADMIN_PASSWORD in the environment). Change it there and redeploy."
      >
        <Link href={back} className="text-gold-text text-sm underline underline-offset-4">
          ← Back to admin
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={user.mustChangePassword ? "Choose your password" : "Change password"}
      intro={
        user.mustChangePassword
          ? "An admin set a temporary password for you. Choose your own to continue."
          : `Signed in as ${user.email}.`
      }
    >
      <ChangePasswordForm callbackUrl={back} />
      {!user.mustChangePassword && (
        <Link
          href={back}
          className="text-gold-text mt-6 inline-block text-sm underline underline-offset-4"
        >
          ← Back to admin
        </Link>
      )}
    </AuthCard>
  );
}
