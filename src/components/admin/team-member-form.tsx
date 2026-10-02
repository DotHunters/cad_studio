"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { saveTeamMember } from "@/server/actions/admin/team";

export type TeamMemberDefaults = {
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "";
  isActive: boolean;
};

/** Add or edit a team member. */
export function TeamMemberForm({
  id,
  defaults,
}: {
  id: string | null;
  defaults: TeamMemberDefaults;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    setServerError(false);
    startTransition(async () => {
      const result = await saveTeamMember(id, input);
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setServerError(true);
    });
  };
  const control = (name: string) => ({
    id: `member-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `member-${name}-error` : undefined,
    className: adminFieldClass,
  });

  return (
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="max-w-2xl space-y-5">
      {errors.form && (
        <p role="alert" className="text-destructive text-sm">
          {errors.form}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" idPrefix="member-" label="Name" hint="Optional" error={errors.name}>
          <input {...control("name")} autoComplete="off" defaultValue={defaults.name} />
        </Field>
        <Field
          name="email"
          idPrefix="member-"
          label="Email"
          hint="Sign-in links are sent here."
          error={errors.email}
        >
          <input
            {...control("email")}
            type="email"
            autoComplete="off"
            defaultValue={defaults.email}
          />
        </Field>
        <Field
          name="role"
          idPrefix="member-"
          label="Role"
          hint="Staff handle bookings and reviews; admins also manage prices, content and the team."
          error={errors.role}
        >
          <select {...control("role")} defaultValue={defaults.role}>
            <option value="">Choose…</option>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults.isActive}
          className="accent-gold size-4"
        />
        Active (can sign in)
      </label>
      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          Something went wrong while saving. Please try again.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : id ? "Save changes" : "Add team member"}
      </Button>
    </form>
  );
}
