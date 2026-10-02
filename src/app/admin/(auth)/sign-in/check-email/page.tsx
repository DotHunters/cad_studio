import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/admin/auth-card";
import { SIGN_IN_PATH } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <AuthCard
      title="Check your email"
      intro="If that address has admin access, a sign-in link is on its way. It expires in 15 minutes."
    >
      <Link href={SIGN_IN_PATH} className="text-gold-text text-sm underline underline-offset-4">
        Use a different email
      </Link>
    </AuthCard>
  );
}
