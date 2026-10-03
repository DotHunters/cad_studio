"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";
import { changeOwnPassword } from "@/server/actions/admin-auth";

/** Current password + new password twice. */
export function ChangePasswordForm({ callbackUrl }: { callbackUrl: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = { ...Object.fromEntries(new FormData(event.currentTarget)), callbackUrl };
    startTransition(async () => {
      const result = await changeOwnPassword(input);
      setErrors(result.fieldErrors);
    });
  };
  const control = (name: string, autoComplete: string) => ({
    id: `password-${name}`,
    name,
    type: "password",
    autoComplete,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `password-${name}-error` : undefined,
    className: adminFieldClass,
  });

  return (
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="space-y-5">
      {errors.form && (
        <p role="alert" className="text-destructive text-sm">
          {errors.form}
        </p>
      )}
      <Field
        name="currentPassword"
        idPrefix="password-"
        label="Current password"
        error={errors.currentPassword}
      >
        <input {...control("currentPassword", "current-password")} />
      </Field>
      <Field
        name="newPassword"
        idPrefix="password-"
        label="New password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. A short sentence works well.`}
        error={errors.newPassword}
      >
        <input {...control("newPassword", "new-password")} />
      </Field>
      <Field
        name="confirmPassword"
        idPrefix="password-"
        label="Confirm new password"
        error={errors.confirmPassword}
      >
        <input {...control("confirmPassword", "new-password")} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
