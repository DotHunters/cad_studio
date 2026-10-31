import { ClipboardList, type LucideIcon, Sparkles, UtensilsCrossed, Speaker } from "lucide-react";

/** The four "Events by CAD" services shown on /events and the home teaser, in display order. */
export const EVENT_SHOWCASE: Array<{
  key: "management" | "decor" | "catering" | "av";
  icon: LucideIcon;
}> = [
  { key: "management", icon: ClipboardList },
  { key: "decor", icon: Sparkles },
  { key: "catering", icon: UtensilsCrossed },
  { key: "av", icon: Speaker },
];
