"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/admin/action-result";
import { cn } from "@/lib/utils";

/**
 * On/off switch for a table row (active, published, featured…). `action` is a Server Action
 * bound to the row's id; the switch flips at once and rolls back if the action refuses.
 */
export function ActionSwitch({
  checked,
  label,
  onText,
  offText,
  action,
}: {
  checked: boolean;
  /** Accessible name, e.g. "Active: Wedding". */
  label: string;
  onText: string;
  offText: string;
  action: (next: boolean) => Promise<ActionResult>;
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !optimistic;
    setError(null);
    startTransition(async () => {
      setOptimistic(next);
      const result = await action(next);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-label={label}
        disabled={pending}
        onClick={toggle}
        className="focus-visible:ring-ring inline-flex items-center gap-2 rounded-full text-xs focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      >
        <span
          aria-hidden
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors",
            optimistic ? "bg-gold border-gold" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "bg-background absolute top-0.5 size-3.5 rounded-full shadow transition-transform",
              optimistic ? "translate-x-4.5" : "translate-x-0.5",
            )}
          />
        </span>
        <span>{optimistic ? onText : offText}</span>
      </button>
      {error && (
        <p role="alert" className="text-destructive mt-1 max-w-56 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Delete (or another one-way action, e.g. "Cancel quote") with an inline "are you sure" step.
 * The action explains when it isn't allowed.
 */
export function ConfirmDeleteButton({
  itemName,
  action,
  verb = "Delete",
  confirmText = "Yes, delete",
}: {
  itemName: string;
  action: () => Promise<ActionResult>;
  verb?: string;
  confirmText?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await action();
      // On success the action revalidates the page and this row disappears.
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
      }
    });

  return (
    <div>
      {confirming ? (
        <div role="group" aria-label={`${verb} ${itemName}?`} className="flex items-center gap-2">
          <span className="text-xs">{verb}?</span>
          <Button type="button" size="sm" variant="destructive" onClick={remove} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {confirmText}
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
          aria-label={`${verb} ${itemName}`}
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          {verb === "Delete" && <Trash2 aria-hidden />}
          {verb}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-destructive mt-1 max-w-64 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
