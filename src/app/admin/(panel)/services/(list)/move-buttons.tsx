"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/admin/action-result";

/** ↑/↓ buttons that move a service one place in the display order. */
export function MoveButtons({
  name,
  moveUp,
  moveDown,
  isFirst,
  isLast,
}: {
  name: string;
  /** Server Actions bound to the service's slug and direction. */
  moveUp: () => Promise<ActionResult>;
  moveDown: () => Promise<ActionResult>;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const move = (action: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div>
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Move ${name} up`}
          disabled={isFirst || pending}
          onClick={() => move(moveUp)}
        >
          <span aria-hidden>↑</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Move ${name} down`}
          disabled={isLast || pending}
          onClick={() => move(moveDown)}
        >
          <span aria-hidden>↓</span>
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive mt-1 max-w-40 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
