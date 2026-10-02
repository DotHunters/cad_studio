import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamMemberForm } from "@/components/admin/team-member-form";
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
      <h1 className="font-heading mt-4 mb-8 text-4xl">{member.name ?? member.email}</h1>
      <TeamMemberForm
        id={id}
        defaults={{
          name: member.name ?? "",
          email: member.email,
          role: member.role,
          isActive: member.isActive,
        }}
      />
    </>
  );
}
