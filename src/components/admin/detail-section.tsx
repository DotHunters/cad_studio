import type { ReactNode } from "react";

import { formatCAD } from "@/lib/money";
import type { LineItem } from "@/lib/pricing/calculate-quote";
import type { TaxLine } from "@/lib/tax";

const money = (cents: number) => formatCAD(cents, "en", { suffix: false });

/** Card with a heading, used on admin detail pages (labelled region). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="bg-card min-w-0 rounded-xl border p-5">
      <h2 id={id} className="mb-3 text-lg font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Two-column term/value list; long values wrap instead of widening the page. */
export function Facts({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Itemized price with tax lines and total. */
export function PriceTable({
  lineItems,
  taxLines,
  subtotalCents,
  totalCents,
  label,
}: {
  lineItems: LineItem[];
  taxLines: TaxLine[];
  subtotalCents: number;
  totalCents: number;
  label: (item: LineItem) => string;
}) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {lineItems.map((item, index) => (
          <tr key={index}>
            <td className="py-1">{label(item)}</td>
            <td className="py-1 text-right tabular-nums">{money(item.amountCents)}</td>
          </tr>
        ))}
        <tr className="border-t">
          <td className="py-1 font-medium">Subtotal</td>
          <td className="py-1 text-right tabular-nums">{money(subtotalCents)}</td>
        </tr>
        {taxLines.map((line) => (
          <tr key={line.code}>
            <td className="py-1">
              {line.code} ({line.rate})
            </td>
            <td className="py-1 text-right tabular-nums">{money(line.amountCents)}</td>
          </tr>
        ))}
        <tr className="border-t font-medium">
          <td className="py-1">Total</td>
          <td className="py-1 text-right tabular-nums">{money(totalCents)}</td>
        </tr>
      </tbody>
    </table>
  );
}
