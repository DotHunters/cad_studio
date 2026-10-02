import type { Metadata } from "next";
import Link from "next/link";

import { TeamMemberForm } from "@/components/admin/team-member-form";
import { formatInStudioTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Team" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminTeamPage({ searchParams }: Props) {
  const me = await requireAdminPage("ADMIN");
  const [{ saved }, members] = await Promise.all([
    searchParams,
    db.user.findMany({
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-4xl">Team</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          People who can sign in to this admin. There are no passwords — each person gets a sign-in
          link by email.
        </p>
        {typeof saved === "string" && (
          <p
            role="status"
            className="mt-6 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            Saved {saved}.
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wider uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Person
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Last active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((member) => (
              <tr key={member.id} className={member.isActive ? "" : "text-muted-foreground"}>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/team/${member.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {member.name ?? member.email}
                  </Link>
                  {member.id === me.id && <span className="text-muted-foreground"> (you)</span>}
                  {member.name && (
                    <span className="text-muted-foreground block text-xs">{member.email}</span>
                  )}
                </td>
                <td className="px-4 py-3">{member.role === "ADMIN" ? "Admin" : "Staff"}</td>
                <td className="px-4 py-3">{member.isActive ? "Active" : "Deactivated"}</td>
                <td className="px-4 py-3">
                  {member.sessions[0]
                    ? formatInStudioTz(member.sessions[0].updatedAt, "MMM d, yyyy")
                    : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="add-member-title">
        <h2 id="add-member-title" className="font-heading mb-4 text-2xl">
          Add a team member
        </h2>
        <TeamMemberForm id={null} defaults={{ name: "", email: "", role: "", isActive: true }} />
      </section>
    </div>
  );
}
