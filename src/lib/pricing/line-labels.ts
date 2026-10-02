import type { LineItem } from "./calculate-quote";

/** Minimal translate signature so this works with next-intl on the client and the server. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Human label for a quote line item, used by the live breakdown and the emails so they never
 * disagree. `t` must be scoped to the "Quote" namespace.
 */
export function lineItemLabel(
  item: LineItem,
  t: Translate,
  names: { packageName: string; addOnNames: Record<string, string> },
): string {
  switch (item.kind) {
    case "base":
      return t("lines.base", { name: names.packageName });
    case "extraHours":
      return t("lines.extraHours", { hours: item.hours });
    case "extraShooters":
      return t("lines.extraShooters", { count: item.shooters, hours: item.hours });
    case "addOn": {
      const name = names.addOnNames[item.code] ?? item.code;
      return item.quantity > 1
        ? t("lines.addOnQty", { name, qty: item.quantity })
        : t("lines.addOn", { name });
    }
    case "travel":
      return t("lines.travel", { km: item.km });
    case "surcharge":
    case "discount":
      return t(`lines.${item.code}`);
  }
}
