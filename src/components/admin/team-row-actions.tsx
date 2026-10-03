"use client";

import { KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { ActionSwitch } from "@/components/admin/row-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { resetTeamMemberPassword, setTeamMemberActive } from "@/server/actions/admin/team";

/** Edit, enable/disable and reset password for one team member. */
export function TeamRowActions({
  id,
  name,
  isActive,
}: {
  id: string;
  name: string;
  isActive: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () =>
    startTransition(async () => {
      setError(null);
      const result = await resetTeamMemberPassword(id);
      setConfirming(false);
      if (result.ok) setPassword(result.password);
      else setError(result.error);
    });

  return (
    <div className="flex flex-wrap items-start gap-3">
      <Link
        href={`/admin/team/${id}`}
        aria-label={`Edit ${name}`}
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Edit
      </Link>
      <ActionSwitch
        checked={isActive}
        label={`Can sign in: ${name}`}
        onText="Enabled"
        offText="Disabled"
        action={setTeamMemberActive.bind(null, id)}
      />
      {confirming ? (
        <div role="group" aria-label={`Reset password for ${name}?`} className="flex gap-2">
          <Button type="button" size="sm" onClick={reset} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Yes, reset
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Reset password for ${name}`}
          onClick={() => {
            setPassword(null);
            setConfirming(true);
          }}
        >
          <KeyRound aria-hidden />
          Reset password
        </Button>
      )}
      {password && (
        <p role="status" className="bg-muted basis-full rounded-lg p-3 text-xs">
          Temporary password for {name}:{" "}
          <code className="bg-background rounded px-1.5 py-0.5 font-mono text-sm select-all">
            {password}
          </code>
          <br />
          Share it privately — it&apos;s shown only once. They choose their own at next sign-in.
        </p>
      )}
      {error && (
        <p role="alert" className="text-destructive basis-full text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
