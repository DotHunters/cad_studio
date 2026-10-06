"use client";

import { useState, useTransition } from "react";

import { adminFieldClass } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/admin/action-result";

const FOCUS_OPTIONS = [
  { value: "top", label: "Top" },
  { value: "center", label: "Centre" },
  { value: "bottom", label: "Bottom" },
];

/** Focus, order and remove controls for one hero slide. Actions are bound to the slide. */
export function SlideControls({
  label,
  focus,
  setFocus,
  moveUp,
  moveDown,
  remove,
  isFirst,
  isLast,
}: {
  /** e.g. "slide 2", used in accessible names. */
  label: string;
  focus: string;
  setFocus: (focus: string) => Promise<ActionResult>;
  moveUp: () => Promise<ActionResult>;
  moveDown: () => Promise<ActionResult>;
  remove: () => Promise<ActionResult>;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Keep in frame
        <select
          aria-label={`Keep in frame: ${label}`}
          defaultValue={focus}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value;
            run(() => setFocus(next));
          }}
          className={adminFieldClass}
        >
          {FOCUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Move ${label} earlier`}
          disabled={isFirst || pending}
          onClick={() => run(moveUp)}
        >
          <span aria-hidden>↑</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Move ${label} later`}
          disabled={isLast || pending}
          onClick={() => run(moveDown)}
        >
          <span aria-hidden>↓</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Remove ${label}`}
          disabled={pending}
          onClick={() => run(remove)}
        >
          Remove
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
