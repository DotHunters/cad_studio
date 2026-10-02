import type { ReactNode } from "react";

export const adminFieldClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-3 focus-visible:outline-none aria-invalid:border-destructive";

/** Label + control + hint + error. Defined at module level so inputs keep their values. */
export function Field({
  name,
  label,
  hint,
  error,
  idPrefix = "pkg-",
  children,
}: {
  name: string;
  /** Prefix of the control's id (`${idPrefix}${name}`). */
  idPrefix?: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`${idPrefix}${name}`} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      {error && (
        <p id={`${idPrefix}${name}-error`} className="text-destructive mt-1 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
