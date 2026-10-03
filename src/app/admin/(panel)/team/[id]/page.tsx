import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamMemberForm } from "@/components/admin/team-member-form";
import { isSuperAdminEmail } from "@/lib/auth/super-admin";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Edit team member" };

type Props = { params: Promise<{ id: string }> };

export default async function EditTeamMemberPage({ params }: Props) {
  await requireAdminPage("ADMIN");
  const { id } = await params;
  const member = await db.user.findUnique({ where: { id } });
  if (!member) notFound();

  return (
    <>
      <Link href="/admin/team" className="text-gold-text text-sm underline underline-offset-4">
        ← Team
      </Link>
      <h1 className="font-heading mt-4 mb-8 text-4xl [overflow-wrap:anywhere]">
        {member.name ?? member.email}
      </h1>
      {isSuperAdminEmail(member.email) ? (
        <p className="text-muted-foreground max-w-2xl text-sm">
          This is the super admin. Its email and password are set in the server environment
          (SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD) and can&apos;t be changed here.
        </p>
      ) : (
        <TeamMemberForm
          id={id}
          defaults={{
            name: member.name ?? "",
            email: member.email,
            role: member.role,
            isActive: member.isActive,
          }}
        />
      )}
    </>
  );
}
