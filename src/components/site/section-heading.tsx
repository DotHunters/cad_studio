import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  eyebrow: string;
  /** Title content; wrap one word in <Accent> for the italic gold emphasis. */
  title: ReactNode;
  intro?: string;
  align?: "left" | "center";
  /** Use on dark (ink) backgrounds. */
  inverted?: boolean;
  as?: "h1" | "h2";
  className?: string;
};

/** Italic, gold accent word inside a heading. */
export function Accent({ children }: { children: ReactNode }) {
  return <em className="text-gold-text font-heading italic">{children}</em>;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  align = "left",
  inverted = false,
  as: Tag = "h2",
  className,
}: Props) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <p
        className={cn(
          "text-xs font-medium tracking-[0.25em] uppercase",
          inverted ? "text-gold-light" : "text-muted-foreground",
        )}
      >
        {eyebrow}
      </p>
      <span
        aria-hidden
        className={cn("bg-gold-gradient mt-3 block h-px w-12", align === "center" && "mx-auto")}
      />
      <Tag
        id={id}
        className={cn(
          "mt-3 text-4xl leading-tight sm:text-5xl",
          inverted && "text-paper [&_em]:text-gold-light",
        )}
      >
        {title}
      </Tag>
      {intro && (
        <p className={cn("mt-4", inverted ? "text-paper/75" : "text-muted-foreground")}>{intro}</p>
      )}
    </div>
  );
}
